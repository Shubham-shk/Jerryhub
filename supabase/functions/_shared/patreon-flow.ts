import {
  optionalEnv,
  redirect,
  requiredEnv,
  safeMessage,
} from "./http.ts";
import {
  consumeOAuthState,
  linkPatreonConnection,
  PatreonLinkError,
  type OAuthStateRow,
} from "./connections.ts";
import { signLoginState, verifyLoginState } from "./oauth-state.ts";
import {
  exchangeCode,
  fetchIdentity,
  PATREON_AUTHORIZE_URL,
  PATREON_SCOPES,
} from "./patreon.ts";
import { createMagicLink, syncPatreonUser } from "./profiles.ts";
import { adminClient } from "./supabase.ts";

export function appUrl(): string {
  return requiredEnv("APP_URL").replace(/\/+$/, "");
}

export function defaultReturnTo(): string {
  return `${appUrl()}/auth/callback`;
}

export function accountReturnTo(): string {
  return `${appUrl()}/account`;
}

function supabaseBase(): string {
  const url = optionalEnv("SUPABASE_URL");
  if (!url) throw new Error("Missing required environment variable: SUPABASE_URL");
  return url.replace(/\/+$/, "");
}

/**
 * Redirect URI used by the existing login flow. Deployments that still use the
 * old `patreon-oauth?action=callback` URL keep working unchanged.
 */
export function loginRedirectUri(): string {
  const explicit = optionalEnv("PATREON_LOGIN_REDIRECT_URI");
  if (explicit) return explicit;
  const legacy = optionalEnv("PATREON_REDIRECT_URI");
  if (legacy) return legacy;
  return `${supabaseBase()}/functions/v1/patreon-oauth?action=callback`;
}

/**
 * Redirect URI used by the account-connection flow. A single registered Patreon
 * redirect URI can serve both flows because `patreon-oauth?action=callback`
 * dispatches signed login states and database connection states.
 */
export function connectRedirectUri(): string {
  const explicit = optionalEnv("PATREON_CONNECT_REDIRECT_URI");
  if (explicit) return explicit;
  const shared = optionalEnv("PATREON_REDIRECT_URI");
  if (shared) return shared;
  return `${supabaseBase()}/functions/v1/patreon-callback`;
}

/** Only same-origin destinations are accepted, so the callback cannot be used as an open redirect. */
export function sanitizeReturnTo(value: string | null, fallback: string): string {
  if (!value) return fallback;
  try {
    if (value.startsWith("/") && !value.startsWith("//")) {
      return new URL(value, appUrl()).toString();
    }
    const url = new URL(value);
    if (url.origin === new URL(appUrl()).origin) return url.toString();
  } catch {
    // Fall through to the safe default.
  }
  return fallback;
}

function withLoginError(base: string, message: string): string {
  const url = new URL(base);
  url.searchParams.set("error", "oauth_failed");
  url.searchParams.set("error_description", message);
  return url.toString();
}

function withConnectSuccess(base: string): string {
  const url = new URL(base);
  url.searchParams.set("patreon", "connected");
  return url.toString();
}

function withConnectError(base: string, reason: string): string {
  const url = new URL(base);
  url.searchParams.set("patreon", "error");
  url.searchParams.set("reason", reason);
  return url.toString();
}

/** Starts the existing login flow (unauthenticated users). */
export async function handleLoginStart(requestUrl: URL): Promise<Response> {
  const returnTo = sanitizeReturnTo(
    requestUrl.searchParams.get("returnTo"),
    defaultReturnTo(),
  );
  const redirectUri = loginRedirectUri();
  const state = await signLoginState({
    returnTo,
    iat: Math.floor(Date.now() / 1000),
    nonce: crypto.randomUUID(),
    redirectUri,
  });

  const authorize = new URL(PATREON_AUTHORIZE_URL);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", requiredEnv("PATREON_CLIENT_ID"));
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", PATREON_SCOPES);
  authorize.searchParams.set("state", state);

  return redirect(authorize.toString());
}

/** Completes the existing login flow and mints a Supabase session. */
export async function handleLoginCallback(requestUrl: URL): Promise<Response> {
  const fallback = defaultReturnTo();
  const stateValue = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const patreonError = requestUrl.searchParams.get("error");
  const patreonErrorDescription = requestUrl.searchParams.get("error_description");

  let returnTo = fallback;
  let redirectUri = loginRedirectUri();
  try {
    if (!stateValue) throw new Error("Patreon did not return a state value.");
    const state = await verifyLoginState(stateValue);
    returnTo = sanitizeReturnTo(state.returnTo, fallback);
    if (state.redirectUri) redirectUri = state.redirectUri;
  } catch (error) {
    console.error("Patreon OAuth state verification failed:", safeMessage(error));
    return redirect(
      withLoginError(fallback, "The login link expired or was tampered with. Please start again."),
    );
  }

  if (patreonError) {
    const message = patreonErrorDescription
      ? `Patreon sign-in was cancelled: ${patreonErrorDescription}`
      : "Patreon sign-in was cancelled. Please try again.";
    return redirect(withLoginError(returnTo, message));
  }

  if (!code) {
    return redirect(withLoginError(returnTo, "Patreon did not return an authorization code."));
  }
  if (code.length > 1024) {
    return redirect(withLoginError(returnTo, "Patreon returned an invalid authorization code."));
  }

  try {
    const token = await exchangeCode(code, redirectUri);
    const membership = await fetchIdentity(token.accessToken);
    const admin = adminClient();
    const user = await syncPatreonUser(admin, membership);
    const tokenHash = await createMagicLink(admin, user.email);

    const success = new URL(returnTo);
    success.searchParams.set("token_hash", tokenHash);
    success.searchParams.set("type", "magiclink");
    return redirect(success.toString());
  } catch (error) {
    console.error("Patreon OAuth callback failed:", safeMessage(error));
    return redirect(
      withLoginError(
        returnTo,
        "We couldn't verify your Patreon membership. Please try again or contact support.",
      ),
    );
  }
}

/**
 * Completes the account-connection flow. The state row was created by
 * `patreon-auth` for an authenticated user, so the callback can link the
 * Patreon identity without trusting anything from the browser.
 */
export async function handleConnectCallback(
  requestUrl: URL,
  consumedState?: OAuthStateRow,
): Promise<Response> {
  const fallback = accountReturnTo();
  const stateValue = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const patreonError = requestUrl.searchParams.get("error");

  let state = consumedState;
  if (!state) {
    try {
      if (!stateValue) throw new Error("Missing state.");
      state = (await consumeOAuthState(adminClient(), stateValue)) ?? undefined;
    } catch (error) {
      console.error("Patreon connect state lookup failed:", safeMessage(error));
      return redirect(withConnectError(fallback, "server_error"));
    }
  }

  if (!state) {
    return redirect(withConnectError(fallback, "invalid_state"));
  }

  const returnTo = sanitizeReturnTo(state.return_to, fallback);

  if (patreonError) {
    return redirect(withConnectError(returnTo, "cancelled"));
  }
  if (!code) {
    return redirect(withConnectError(returnTo, "missing_code"));
  }
  if (code.length > 1024) {
    return redirect(withConnectError(returnTo, "connect_failed"));
  }

  try {
    const token = await exchangeCode(code, state.redirect_uri);
    const membership = await fetchIdentity(token.accessToken);
    await linkPatreonConnection(adminClient(), state.user_id, membership, token);
    return redirect(withConnectSuccess(returnTo));
  } catch (error) {
    if (error instanceof PatreonLinkError) {
      console.warn("Patreon connect rejected:", error.code);
      return redirect(withConnectError(returnTo, error.code));
    }
    console.error("Patreon connect callback failed:", safeMessage(error));
    return redirect(withConnectError(returnTo, "connect_failed"));
  }
}

/**
 * Single callback entry point. Random DB-backed states (no dot) belong to the
 * connect flow; signed HMAC states belong to the login flow.
 */
export async function handleOAuthCallback(requestUrl: URL): Promise<Response> {
  const stateValue = requestUrl.searchParams.get("state");

  if (stateValue && !stateValue.includes(".")) {
    let stateRow: OAuthStateRow | null = null;
    try {
      stateRow = await consumeOAuthState(adminClient(), stateValue);
    } catch (error) {
      console.error("Patreon connect state lookup failed:", safeMessage(error));
      return redirect(withConnectError(accountReturnTo(), "server_error"));
    }
    if (!stateRow) {
      return redirect(withConnectError(accountReturnTo(), "invalid_state"));
    }
    return await handleConnectCallback(requestUrl, stateRow);
  }

  return await handleLoginCallback(requestUrl);
}
