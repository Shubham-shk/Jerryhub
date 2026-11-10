import {
  bearerToken,
  json,
  preflight,
  requiredEnv,
  safeMessage,
} from "../_shared/http.ts";
import { createOAuthState } from "../_shared/connections.ts";
import {
  accountReturnTo,
  connectRedirectUri,
  sanitizeReturnTo,
} from "../_shared/patreon-flow.ts";
import { PATREON_AUTHORIZE_URL, PATREON_SCOPES } from "../_shared/patreon.ts";
import { adminClient } from "../_shared/supabase.ts";

/**
 * Starts the account-connection flow for a signed-in Jerryhub user.
 *
 * The user id is read from the caller's Supabase JWT and bound to a random,
 * single-use state row. The browser never supplies the user id.
 */
Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;

  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed." },
      405,
      { Allow: "POST, OPTIONS" },
      request,
    );
  }

  const token = bearerToken(request);
  if (!token) {
    return json(
      { error: "Sign in to Jerryhub before connecting Patreon." },
      401,
      {},
      request,
    );
  }

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return json(
        { error: "Your session has expired. Please sign in again." },
        401,
        {},
        request,
      );
    }

    const body = (await request.json().catch(() => ({}))) as { returnTo?: unknown };
    const returnTo = sanitizeReturnTo(
      typeof body.returnTo === "string" ? body.returnTo : null,
      accountReturnTo(),
    );
    const redirectUri = connectRedirectUri();
    const state = await createOAuthState(
      admin,
      userData.user.id,
      returnTo,
      redirectUri,
    );

    const authorize = new URL(PATREON_AUTHORIZE_URL);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", requiredEnv("PATREON_CLIENT_ID"));
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("scope", PATREON_SCOPES);
    authorize.searchParams.set("state", state);

    return json({ url: authorize.toString() }, 200, {}, request);
  } catch (error) {
    console.error("Patreon auth start failed:", safeMessage(error));
    return json(
      { error: "Could not start the Patreon connection. Please try again." },
      500,
      {},
      request,
    );
  }
});
