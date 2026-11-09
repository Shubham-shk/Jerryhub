import {
  optionalEnv,
  redirect,
  requiredEnv,
  safeMessage,
} from "../_shared/http.ts";
import {
  exchangeCode,
  fetchIdentity,
  PATREON_SCOPES,
} from "../_shared/patreon.ts";
import { createMagicLink, syncPatreonUser } from "../_shared/profiles.ts";
import { adminClient } from "../_shared/supabase.ts";

interface OAuthState {
  returnTo: string;
  iat: number;
  nonce: string;
}

function appUrl(): string {
  return requiredEnv("APP_URL").replace(/\/+$/, "");
}

function defaultReturnTo(): string {
  return `${appUrl()}/auth/callback`;
}

function redirectUri(): string {
  return (
    optionalEnv("PATREON_REDIRECT_URI") ||
    `${requiredEnv("SUPABASE_URL")}/functions/v1/patreon-oauth?action=callback`
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function stateKey(): Promise<CryptoKey> {
  const secret = requiredEnv("PATREON_STATE_SECRET");
  if (secret.length < 32) {
    throw new Error("PATREON_STATE_SECRET must be at least 32 characters.");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signState(payload: OAuthState): Promise<string> {
  const body = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await stateKey(),
    new TextEncoder().encode(body),
  );
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyState(value: string): Promise<OAuthState> {
  const [body, signature] = value.split(".");
  if (!body || !signature) throw new Error("Malformed state.");

  const valid = await crypto.subtle.verify(
    "HMAC",
    await stateKey(),
    base64UrlToBytes(signature),
    new TextEncoder().encode(body),
  );
  if (!valid) throw new Error("Invalid state signature.");

  const parsed = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(body)),
  ) as OAuthState;

  if (!parsed.returnTo || typeof parsed.returnTo !== "string") {
    throw new Error("State is missing a return URL.");
  }
  if (!Number.isFinite(parsed.iat) || Date.now() / 1000 - parsed.iat > 15 * 60) {
    throw new Error("Login state has expired.");
  }
  return parsed;
}

function sameOriginReturnTo(value: string | null): string {
  const fallback = defaultReturnTo();
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (url.origin === new URL(appUrl()).origin) return url.toString();
  } catch {
    // Fall through to the safe default.
  }
  return fallback;
}

function withError(base: string, message: string): string {
  const url = new URL(base);
  url.searchParams.set("error", "oauth_failed");
  url.searchParams.set("error_description", message);
  return url.toString();
}

async function handleStart(requestUrl: URL): Promise<Response> {
  const returnTo = sameOriginReturnTo(requestUrl.searchParams.get("returnTo"));
  const state = await signState({
    returnTo,
    iat: Math.floor(Date.now() / 1000),
    nonce: crypto.randomUUID(),
  });

  const authorize = new URL("https://www.patreon.com/oauth2/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", requiredEnv("PATREON_CLIENT_ID"));
  authorize.searchParams.set("redirect_uri", redirectUri());
  authorize.searchParams.set("scope", PATREON_SCOPES);
  authorize.searchParams.set("state", state);

  return redirect(authorize.toString());
}

async function handleCallback(requestUrl: URL): Promise<Response> {
  const fallback = defaultReturnTo();
  const stateValue = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const patreonError = requestUrl.searchParams.get("error");
  const patreonErrorDescription = requestUrl.searchParams.get("error_description");

  let returnTo = fallback;
  try {
    if (!stateValue) throw new Error("Patreon did not return a state value.");
    const state = await verifyState(stateValue);
    returnTo = sameOriginReturnTo(state.returnTo);
  } catch (error) {
    console.error("Patreon OAuth state verification failed:", safeMessage(error));
    return redirect(withError(fallback, "The login link expired or was tampered with. Please start again."));
  }

  if (patreonError) {
    const message = patreonErrorDescription
      ? `Patreon sign-in was cancelled: ${patreonErrorDescription}`
      : "Patreon sign-in was cancelled. Please try again.";
    return redirect(withError(returnTo, message));
  }

  if (!code) {
    return redirect(withError(returnTo, "Patreon did not return an authorization code."));
  }

  try {
    const token = await exchangeCode(code, redirectUri());
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
      withError(
        returnTo,
        "We couldn't verify your Patreon membership. Please try again or contact support.",
      ),
    );
  }
}

Deno.serve(async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "start";
    if (action === "start") return await handleStart(url);
    if (action === "callback") return await handleCallback(url);
    return new Response("Unknown action", { status: 400 });
  } catch (error) {
    console.error("Patreon OAuth error:", safeMessage(error));
    return new Response("Patreon sign-in is temporarily unavailable.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
});
