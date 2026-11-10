import {
  bearerToken,
  json,
  preflight,
  safeMessage,
} from "../_shared/http.ts";
import { clearPatreonConnection } from "../_shared/connections.ts";
import { adminClient } from "../_shared/supabase.ts";

/**
 * Disconnects the caller's Patreon account.
 *
 * Tokens are deleted from the database and the profile's membership fields are
 * cleared. The Jerryhub account itself (email, name, avatar, admin flag) is
 * preserved. Patreon has no public token-revocation endpoint, so removal of the
 * stored tokens is the effective revocation for this application.
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
    return json({ error: "Please sign in to continue." }, 401, {}, request);
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

    await clearPatreonConnection(admin, userData.user.id);
    return json({ ok: true }, 200, {}, request);
  } catch (error) {
    console.error("Patreon disconnect failed:", safeMessage(error));
    return json(
      { error: "Could not disconnect Patreon. Please try again." },
      500,
      {},
      request,
    );
  }
});
