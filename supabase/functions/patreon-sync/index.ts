import {
  bearerToken,
  json,
  preflight,
  safeMessage,
} from "../_shared/http.ts";
import {
  applyMembershipToProfile,
  clearPatreonConnection,
  getPublicConnection,
  updateConnectionMembership,
} from "../_shared/connections.ts";
import {
  fetchIdentity,
  PatreonApiError,
  refreshAccessToken,
  resolveAccessLevelFromMembership,
  type PatreonMembership,
  type PatreonTokenSet,
} from "../_shared/patreon.ts";
import { adminClient } from "../_shared/supabase.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

interface StoredConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scopes: string | null;
}

const REAUTH_REQUIRED = "REAUTH_REQUIRED";

async function persistRefreshedToken(
  admin: SupabaseClient,
  connection: StoredConnection,
  token: PatreonTokenSet,
): Promise<void> {
  const expiresAt = token.expiresIn > 0
    ? new Date(Date.now() + token.expiresIn * 1000).toISOString()
    : null;
  const refreshExpiresAt = token.refreshTokenExpiresIn > 0
    ? new Date(Date.now() + token.refreshTokenExpiresIn * 1000).toISOString()
    : null;

  const { error } = await admin
    .from("patreon_connections")
    .update({
      access_token: token.accessToken,
      refresh_token: token.refreshToken ?? connection.refresh_token,
      token_type: token.tokenType,
      scopes: token.scope ?? connection.scopes,
      expires_at: expiresAt,
      refresh_token_expires_at: refreshExpiresAt,
    })
    .eq("id", connection.id);
  if (error) throw error;
}

async function refreshConnectionToken(
  admin: SupabaseClient,
  connection: StoredConnection,
): Promise<string> {
  if (!connection.refresh_token) throw new Error(REAUTH_REQUIRED);

  try {
    const token = await refreshAccessToken(connection.refresh_token);
    await persistRefreshedToken(admin, connection, token);
    return token.accessToken;
  } catch (error) {
    if (
      error instanceof PatreonApiError &&
      (error.status === 400 || error.status === 401 || error.status === 403)
    ) {
      throw new Error(REAUTH_REQUIRED);
    }
    throw error;
  }
}

async function ensureAccessToken(
  admin: SupabaseClient,
  connection: StoredConnection,
): Promise<string> {
  const expiresAt = connection.expires_at ? Date.parse(connection.expires_at) : 0;
  if (expiresAt && expiresAt - Date.now() > 60_000) {
    return connection.access_token;
  }
  return await refreshConnectionToken(admin, connection);
}

/**
 * Reads the verified membership, refreshing the access token when it is near
 * expiry and retrying once if Patreon rejects it mid-flight. Returns null when
 * the stored credentials can no longer be used and the user must reconnect.
 */
async function loadMembership(
  admin: SupabaseClient,
  connection: StoredConnection,
): Promise<PatreonMembership | null> {
  let accessToken: string;
  try {
    accessToken = await ensureAccessToken(admin, connection);
  } catch (error) {
    if (safeMessage(error) === REAUTH_REQUIRED) return null;
    throw error;
  }

  try {
    return await fetchIdentity(accessToken);
  } catch (error) {
    if (
      !(error instanceof PatreonApiError) ||
      (error.status !== 401 && error.status !== 403)
    ) {
      throw error;
    }
  }

  // The token was rejected even though it had not expired. Refresh once and
  // retry; a failure here means the user has to reconnect.
  try {
    const refreshed = await refreshConnectionToken(admin, connection);
    return await fetchIdentity(refreshed);
  } catch (error) {
    if (
      safeMessage(error) === REAUTH_REQUIRED ||
      (error instanceof PatreonApiError &&
        (error.status === 400 || error.status === 401 || error.status === 403))
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Re-verifies the caller's Patreon membership with the Patreon API, refreshing
 * the stored token when needed and mirroring the verified result onto both the
 * connection row and public.profiles.
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

    const userId = userData.user.id;
    const { data: connection, error: connectionError } = await admin
      .from("patreon_connections")
      .select("id, user_id, access_token, refresh_token, expires_at, scopes")
      .eq("user_id", userId)
      .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) {
      return json(
        { error: "Patreon is not connected to this account.", code: "not_connected" },
        404,
        {},
        request,
      );
    }

    const stored = connection as StoredConnection;

    const reauth = async (): Promise<Response> => {
      try {
        await clearPatreonConnection(admin, userId);
      } catch (error) {
        console.error("Could not clear revoked connection:", safeMessage(error));
      }
      return json(
        {
          error: "Patreon access expired or was revoked. Reconnect your account.",
          code: "reauth_required",
        },
        401,
        {},
        request,
      );
    };

    const membership = await loadMembership(admin, stored);
    if (!membership) return await reauth();

    await updateConnectionMembership(admin, userId, membership);
    await applyMembershipToProfile(admin, userId, membership, { link: false });

    const publicConnection = await getPublicConnection(admin, userId);
    return json(
      {
        ok: true,
        connection: publicConnection,
        accessLevel: resolveAccessLevelFromMembership(membership),
      },
      200,
      {},
      request,
    );
  } catch (error) {
    console.error("Patreon sync failed:", safeMessage(error));
    return json(
      { error: "Could not refresh your Patreon membership. Please try again." },
      500,
      {},
      request,
    );
  }
});
