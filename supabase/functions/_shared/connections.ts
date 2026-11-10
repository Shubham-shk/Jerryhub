import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { randomToken, sha256Hex } from "./crypto.ts";
import { safeMessage } from "./http.ts";
import type { PatreonMembership, PatreonTokenSet } from "./patreon.ts";

/** Columns that are safe to return to the browser. Tokens are never included. */
export const PUBLIC_CONNECTION_COLUMNS = [
  "id",
  "user_id",
  "patreon_user_id",
  "patreon_member_id",
  "patreon_email",
  "patreon_full_name",
  "patreon_avatar_url",
  "scopes",
  "expires_at",
  "membership_status",
  "patron_status",
  "entitled_tier_ids",
  "pledge_amount_cents",
  "patreon_campaign_id",
  "connected_at",
  "updated_at",
].join(", ");

export type PatreonLinkErrorCode = "already_linked" | "different_account" | "missing_identity";

export class PatreonLinkError extends Error {
  code: PatreonLinkErrorCode;

  constructor(code: PatreonLinkErrorCode, message: string) {
    super(message);
    this.name = "PatreonLinkError";
    this.code = code;
  }
}

export interface OAuthStateRow {
  user_id: string;
  return_to: string;
  redirect_uri: string;
}

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Creates a single-use OAuth state bound to the signed-in Jerryhub user.
 *
 * Only the SHA-256 hash is stored, so a database leak cannot be replayed as a
 * valid state. The callback runs without the browser's Supabase session, which
 * is why the user id is bound server-side here instead of being trusted from
 * the redirect.
 */
export async function createOAuthState(
  admin: SupabaseClient,
  userId: string,
  returnTo: string,
  redirectUri: string,
): Promise<string> {
  const state = randomToken(32);
  const stateHash = await sha256Hex(state);
  const now = Date.now();

  // Invalidate any older, still-open attempts for this user. This keeps the
  // table small and prevents a stale tab from completing an unexpected link.
  const { error: cleanupError } = await admin
    .from("patreon_oauth_states")
    .delete()
    .eq("user_id", userId);
  if (cleanupError) throw cleanupError;

  const { error } = await admin.from("patreon_oauth_states").insert({
    state_hash: stateHash,
    user_id: userId,
    return_to: returnTo,
    redirect_uri: redirectUri,
    expires_at: new Date(now + STATE_TTL_MS).toISOString(),
  });
  if (error) throw error;

  return state;
}

/**
 * Atomically consumes a connect state. Returns null when the state is unknown,
 * expired or already used. Database failures throw so the caller can log them.
 */
export async function consumeOAuthState(
  admin: SupabaseClient,
  state: string,
): Promise<OAuthStateRow | null> {
  if (!state || state.length > 256) return null;
  const stateHash = await sha256Hex(state);

  const { data, error } = await admin
    .from("patreon_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state_hash", stateHash)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id, return_to, redirect_uri")
    .maybeSingle();

  if (error) throw error;
  return (data as OAuthStateRow | null) ?? null;
}

async function assertNotLinkedToAnotherUser(
  admin: SupabaseClient,
  userId: string,
  membership: PatreonMembership,
): Promise<void> {
  const { data: connectionOwner, error: connectionError } = await admin
    .from("patreon_connections")
    .select("user_id")
    .eq("patreon_user_id", membership.userId)
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (connectionOwner && connectionOwner.user_id !== userId) {
    throw new PatreonLinkError(
      "already_linked",
      "That Patreon account is already connected to another Jerryhub account.",
    );
  }

  const { data: profileOwner, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("patreon_user_id", membership.userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profileOwner && profileOwner.id !== userId) {
    throw new PatreonLinkError(
      "already_linked",
      "That Patreon account is already connected to another Jerryhub account.",
    );
  }

  if (membership.memberId) {
    const { data: memberOwner, error: memberError } = await admin
      .from("profiles")
      .select("id")
      .eq("patreon_member_id", membership.memberId)
      .maybeSingle();
    if (memberError) throw memberError;
    if (memberOwner && memberOwner.id !== userId) {
      throw new PatreonLinkError(
        "already_linked",
        "That Patreon membership is already connected to another Jerryhub account.",
      );
    }

    const { data: connectionMemberOwner, error: connectionMemberError } = await admin
      .from("patreon_connections")
      .select("user_id")
      .eq("patreon_member_id", membership.memberId)
      .maybeSingle();
    if (connectionMemberError) throw connectionMemberError;
    if (connectionMemberOwner && connectionMemberOwner.user_id !== userId) {
      throw new PatreonLinkError(
        "already_linked",
        "That Patreon membership is already connected to another Jerryhub account.",
      );
    }
  }
}

/**
 * Links a verified Patreon identity to an existing Jerryhub user, stores the
 * tokens server-side and mirrors the verified membership onto public.profiles.
 */
export async function linkPatreonConnection(
  admin: SupabaseClient,
  userId: string,
  membership: PatreonMembership,
  token: PatreonTokenSet,
): Promise<void> {
  if (!membership.userId) {
    throw new PatreonLinkError("missing_identity", "Patreon did not return a user id.");
  }

  await assertNotLinkedToAnotherUser(admin, userId, membership);

  const { data: existing, error: existingError } = await admin
    .from("patreon_connections")
    .select("id, patreon_user_id, connected_at, refresh_token, scopes")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing && existing.patreon_user_id !== membership.userId) {
    throw new PatreonLinkError(
      "different_account",
      "This Jerryhub account is already connected to a different Patreon account. Disconnect it first.",
    );
  }

  const now = new Date();
  const expiresAt = token.expiresIn > 0
    ? new Date(now.getTime() + token.expiresIn * 1000).toISOString()
    : null;
  const refreshExpiresAt = token.refreshTokenExpiresIn > 0
    ? new Date(now.getTime() + token.refreshTokenExpiresIn * 1000).toISOString()
    : null;

  const row = {
    user_id: userId,
    patreon_user_id: membership.userId,
    patreon_member_id: membership.memberId,
    patreon_email: membership.email,
    patreon_full_name: membership.fullName,
    patreon_avatar_url: membership.avatarUrl,
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? existing?.refresh_token ?? null,
    token_type: token.tokenType || "Bearer",
    scopes: token.scope ?? existing?.scopes ?? null,
    expires_at: expiresAt,
    refresh_token_expires_at: refreshExpiresAt,
    membership_status: membership.active ? "active" : "inactive",
    patron_status: membership.patronStatus,
    entitled_tier_ids: membership.tierIds,
    pledge_amount_cents: membership.amountCents,
    patreon_campaign_id: membership.campaignId,
    connected_at: existing?.connected_at ?? now.toISOString(),
  };

  const { error: upsertError } = await admin
    .from("patreon_connections")
    .upsert(row, { onConflict: "user_id" });
  if (upsertError) throw upsertError;

  await applyMembershipToProfile(admin, userId, membership, { link: true });
}

/**
 * Mirrors verified Patreon membership onto public.profiles. Display fields the
 * user already has (name, avatar) are never overwritten.
 */
export async function applyMembershipToProfile(
  admin: SupabaseClient,
  userId: string,
  membership: PatreonMembership,
  options: { link: boolean },
): Promise<void> {
  const { data: current, error: readError } = await admin
    .from("profiles")
    .select("membership_status, entitled_tier_ids, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const nextStatus = membership.active ? "active" : "inactive";
  const update: Record<string, unknown> = {
    membership_status: nextStatus,
    entitled_tier_ids: membership.tierIds,
    pledge_amount_cents: membership.amountCents,
    patreon_campaign_id: membership.campaignId,
    last_synced_at: new Date().toISOString(),
  };

  if (options.link) {
    update.patreon_user_id = membership.userId;
    update.patreon_member_id = membership.memberId;
  }
  if (!current?.full_name && membership.fullName) update.full_name = membership.fullName;
  if (!current?.avatar_url && membership.avatarUrl) update.avatar_url = membership.avatarUrl;

  const { error: updateError } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (updateError) throw updateError;

  const previousTiers = Array.isArray(current?.entitled_tier_ids)
    ? (current.entitled_tier_ids as string[])
    : [];
  const previousStatus = (current?.membership_status as string | undefined) ?? null;
  const tierChanged =
    previousTiers.slice().sort().join(",") !== membership.tierIds.slice().sort().join(",");

  if (previousStatus !== nextStatus || tierChanged) {
    await recordMembershipEvent(
      admin,
      userId,
      options.link ? "patreon.connect" : "patreon.sync",
      previousStatus,
      nextStatus,
      previousTiers,
      membership.tierIds,
    );
  }
}

/** Refreshes only the membership fields on an existing connection. */
export async function updateConnectionMembership(
  admin: SupabaseClient,
  userId: string,
  membership: PatreonMembership,
): Promise<void> {
  const { error } = await admin
    .from("patreon_connections")
    .update({
      membership_status: membership.active ? "active" : "inactive",
      patron_status: membership.patronStatus,
      entitled_tier_ids: membership.tierIds,
      pledge_amount_cents: membership.amountCents,
      patreon_campaign_id: membership.campaignId,
      patreon_email: membership.email,
      patreon_full_name: membership.fullName,
      patreon_avatar_url: membership.avatarUrl,
    })
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Removes the stored Patreon connection and clears membership fields on the
 * profile. Identity fields (email, name, avatar, admin flag) are preserved.
 */
export async function clearPatreonConnection(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: current, error: readError } = await admin
    .from("profiles")
    .select("membership_status, entitled_tier_ids")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const { error: deleteError } = await admin
    .from("patreon_connections")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      membership_status: "inactive",
      entitled_tier_ids: [],
      pledge_amount_cents: 0,
      patreon_campaign_id: null,
      patreon_user_id: null,
      patreon_member_id: null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (updateError) throw updateError;

  const previousTiers = Array.isArray(current?.entitled_tier_ids)
    ? (current.entitled_tier_ids as string[])
    : [];
  await recordMembershipEvent(
    admin,
    userId,
    "patreon.disconnect",
    (current?.membership_status as string | undefined) ?? null,
    "inactive",
    previousTiers,
    [],
  );
}

/** Append-only audit row. Never blocks the membership update if it fails. */
export async function recordMembershipEvent(
  admin: SupabaseClient,
  profileId: string,
  eventType: string,
  fromStatus: string | null,
  toStatus: string | null,
  fromTiers: string[],
  toTiers: string[],
): Promise<void> {
  try {
    const { error } = await admin.from("membership_events").insert({
      profile_id: profileId,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      from_tier: fromTiers.join(",") || null,
      to_tier: toTiers.join(",") || null,
      source: "patreon",
    });
    if (error) {
      console.warn("Could not record membership event:", error.message);
    }
  } catch (error) {
    console.warn("Could not record membership event:", safeMessage(error));
  }
}

export async function getPublicConnection(
  admin: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin
    .from("patreon_connections")
    .select(PUBLIC_CONNECTION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}
