import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { PatreonMembership } from "./patreon.ts";

const SYNTHETIC_EMAIL_DOMAIN = "patreon.lewdiiihub.com";

function syntheticEmail(patreonUserId: string): string {
  return `patreon-${patreonUserId}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

/**
 * Resolve the Supabase auth user for a Patreon identity, creating one when
 * needed, then mirror the latest Patreon membership onto public.profiles.
 */
export async function syncPatreonUser(
  admin: SupabaseClient,
  membership: PatreonMembership,
): Promise<{ userId: string; email: string }> {
  if (!membership.userId) throw new Error("Patreon did not return a user id.");

  let profileId: string | null = null;
  let profileEmail: string | null = null;

  const byPatreon = await admin
    .from("profiles")
    .select("id, email")
    .eq("patreon_user_id", membership.userId)
    .maybeSingle();
  if (byPatreon.error) throw byPatreon.error;
  if (byPatreon.data) {
    profileId = byPatreon.data.id as string;
    profileEmail = (byPatreon.data.email as string | null) ?? null;
  }

  if (!profileId && membership.email) {
    const byEmail = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", membership.email)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data) {
      profileId = byEmail.data.id as string;
      profileEmail = (byEmail.data.email as string | null) ?? null;
    }
  }

  let authEmail = membership.email || profileEmail || syntheticEmail(membership.userId);

  if (!profileId) {
    const created = await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      user_metadata: {
        full_name: membership.fullName,
        avatar_url: membership.avatarUrl,
        patreon_user_id: membership.userId,
        provider: "patreon",
      },
      app_metadata: {
        provider: "patreon",
        patreon_user_id: membership.userId,
        patreon_member_id: membership.memberId,
      },
    });

    if (created.error || !created.data.user) {
      // A previous auth user may exist even if the profile lookup missed it
      // (for example if the profile trigger was added after that user signed up).
      const existing = await findUserByEmail(admin, authEmail);
      if (!existing) throw created.error ?? new Error("Could not create the auth user.");
      profileId = existing.id;
      authEmail = existing.email || authEmail;
    } else {
      profileId = created.data.user.id;
      authEmail = created.data.user.email || authEmail;
    }
  }

  if (!profileId) throw new Error("Could not resolve a Supabase user.");

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: profileId,
      patreon_user_id: membership.userId,
      patreon_member_id: membership.memberId,
      email: membership.email || profileEmail || null,
      full_name: membership.fullName,
      avatar_url: membership.avatarUrl,
      membership_status: membership.active ? "active" : "inactive",
      entitled_tier_ids: membership.tierIds,
      pledge_amount_cents: membership.amountCents,
      patreon_campaign_id: membership.campaignId,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  // Keep the auth metadata useful for the frontend avatar/name fallbacks.
  const { error: metadataError } = await admin.auth.admin.updateUserById(profileId, {
    user_metadata: {
      full_name: membership.fullName,
      avatar_url: membership.avatarUrl,
      patreon_user_id: membership.userId,
    },
    app_metadata: {
      provider: "patreon",
      patreon_user_id: membership.userId,
      patreon_member_id: membership.memberId,
    },
  });
  if (metadataError) {
    console.warn("Could not update auth metadata:", metadataError.message);
  }

  return { userId: profileId, email: authEmail };
}

export async function createMagicLink(
  admin: SupabaseClient,
  email: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;

  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error("Supabase did not return a login token.");
  return tokenHash;
}
