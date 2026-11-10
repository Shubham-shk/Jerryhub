import { optionalEnv, safeMessage } from "../_shared/http.ts";
import { handleOAuthCallback } from "../_shared/patreon-flow.ts";

/**
 * OAuth redirect target for the account-connection flow.
 *
 * This is a browser redirect, not a fetch: it validates the single-use state,
 * exchanges the code, verifies the Patreon membership and then sends the user
 * back to /account. It also accepts the existing login-flow HMAC state so a
 * Patreon app with a single registered redirect URI can serve both flows.
 */
Deno.serve(async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  try {
    return await handleOAuthCallback(new URL(request.url));
  } catch (error) {
    console.error("Patreon callback failed:", safeMessage(error));
    const base = optionalEnv("APP_URL").replace(/\/+$/, "");
    if (!base) {
      return new Response("Patreon connection is temporarily unavailable.", {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${base}/account?patreon=error&reason=server_error`,
        "Cache-Control": "no-store",
      },
    });
  }
});
