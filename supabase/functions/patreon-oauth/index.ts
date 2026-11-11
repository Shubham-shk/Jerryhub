import { safeMessage } from "../_shared/http.ts";
import {
  handleLoginStart,
  handleOAuthCallback,
} from "../_shared/patreon-flow.ts";

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
    if (action === "start") return await handleLoginStart(url);
    // One registered redirect URI can serve both flows: signed HMAC states are
    // login callbacks, random database states are account-connection callbacks.
    if (action === "callback") return await handleOAuthCallback(url);
    return new Response("Unknown action", { status: 400 });
  } catch (error) {
    console.error("Patreon OAuth error:", safeMessage(error));
    return new Response("Patreon sign-in is temporarily unavailable.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
});
