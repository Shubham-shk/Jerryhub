import {
  json,
  preflight,
  safeMessage,
} from "../_shared/http.ts";
import { resolveAccessLevelFromMembership, tierIdsFromEnv, basicTierIdsFromEnv, fullTierIdsFromEnv, type AccessLevel } from "../_shared/patreon.ts";
import { adminClient } from "../_shared/supabase.ts";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_BATCH = 100;

const ACCESS_RANK: Record<AccessLevel, number> = { public: 0, basic: 1, full: 2 };

function normalizeAccessLevel(value: unknown): AccessLevel {
  return value === "public" || value === "basic" || value === "full" ? value : "full";
}

interface AssetRow {
  id: string;
  set_id: string;
  storage_path: string;
  file_name: string;
  type: string;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;

  // Pass the original request so the response echoes the caller's allowed
  // origin (the apex and www origins are both accepted).
  const respond = (
    body: unknown,
    status = 200,
    extraHeaders: Record<string, string> = {},
  ) => json(body, status, extraHeaders, request);

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405, { Allow: "POST, OPTIONS" });
  }

  const token = bearerToken(request);
  if (!token) {
    return respond({ error: "Please sign in with Patreon to continue." }, 401);
  }

  let body: { assetId?: unknown; assetIds?: unknown; download?: unknown };
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Invalid request body." }, 400);
  }

  const requested = Array.isArray(body.assetIds)
    ? body.assetIds
    : body.assetId
      ? [body.assetId]
      : [];

  const assetIds = [
    ...new Set(
      requested
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .slice(0, MAX_BATCH + 1),
    ),
  ];

  if (assetIds.length === 0) {
    return respond({ error: "Choose a file to unlock." }, 400);
  }
  if (assetIds.length > MAX_BATCH) {
    return respond({ error: `You can unlock at most ${MAX_BATCH} files at once.` }, 400);
  }

  try {
    const admin = adminClient();

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return respond({ error: "Your session has expired. Please sign in again." }, 401);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select(
        "membership_status, entitled_tier_ids, pledge_amount_cents, patreon_campaign_id, is_admin",
      )
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return respond({ error: "Your membership could not be verified." }, 403);
    }

    // Admins need access for previews; everyone else must pass the same
    // entitlement checks used by the OAuth callback and webhook.
    let userAccess: AccessLevel = "full";
    if (!profile.is_admin) {
      if (profile.membership_status !== "active") {
        return respond(
          { error: "Your Patreon membership is inactive. Update your pledge to regain access." },
          403,
        );
      }

      const campaignId = Deno.env.get("PATREON_CAMPAIGN_ID")?.trim() || "";
      if (campaignId && profile.patreon_campaign_id !== campaignId) {
        return respond({ error: "This Patreon membership is not for this campaign." }, 403);
      }

      const tiers = [
        ...new Set([
          ...basicTierIdsFromEnv(),
          ...fullTierIdsFromEnv(),
          ...tierIdsFromEnv(),
        ]),
      ];
      const entitled = Array.isArray(profile.entitled_tier_ids)
        ? (profile.entitled_tier_ids as string[])
        : [];

      userAccess = resolveAccessLevelFromMembership({
        patronStatus: "active_patron",
        campaignId: profile.patreon_campaign_id as string | null,
        tierIds: entitled,
        amountCents: Number(profile.pledge_amount_cents || 0),
      });

      if (userAccess === "public") {
        if (tiers.length > 0) {
          return respond({ error: "Your pledge does not include a recognized membership tier." }, 403);
        }
        return respond({ error: "Your pledge does not meet the required amount." }, 403);
      }
    }

    const { data: assetRows, error: assetError } = await admin
      .from("media_assets")
      .select("id, set_id, storage_path, file_name, type")
      .in("id", assetIds);
    if (assetError) throw assetError;

    const assets = (assetRows ?? []) as AssetRow[];
    if (assets.length !== assetIds.length) {
      return respond({ error: "One or more files are unavailable." }, 404);
    }

    const setIds = [...new Set(assets.map((asset) => asset.set_id))];
    const { data: setRows, error: setError } = await admin
      .from("media_sets")
      .select("id, published, access_level")
      .in("id", setIds);
    if (setError) throw setError;

    const setAccess = new Map<string, { published: boolean; access: AccessLevel }>(
      (setRows ?? []).map((set) => [
        set.id as string,
        {
          published: set.published === true,
          access: normalizeAccessLevel(set.access_level),
        },
      ]),
    );

    for (const asset of assets) {
      const set = setAccess.get(asset.set_id);
      if (!set?.published) {
        return respond({ error: "This media set is not published." }, 404);
      }
      if (ACCESS_RANK[userAccess] < ACCESS_RANK[set.access]) {
        if (set.access === "full" && userAccess === "basic") {
          return respond(
            { error: "This release is included with Full Access. Upgrade to unlock it." },
            403,
          );
        }
        return respond({ error: "Your membership does not include access to this release." }, 403);
      }
    }

    const storage = admin.storage.from("premium");
    const wantsDownload = body.download === true;

    if (assetIds.length === 1) {
      const asset = assets[0];
      const { data, error } = await storage.createSignedUrl(
        asset.storage_path,
        SIGNED_URL_TTL_SECONDS,
        wantsDownload ? { download: asset.file_name } : undefined,
      );
      if (error || !data?.signedUrl) throw error ?? new Error("Could not sign the URL.");
      return respond({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
    }

    const { data: signedRows, error: signError } = await storage.createSignedUrls(
      assets.map((asset) => asset.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );
    if (signError) throw signError;

    const byPath = new Map(
      (signedRows ?? []).map((row) => [row.path, row.signedUrl] as const),
    );
    const urls = assets
      .map((asset) => {
        const url = byPath.get(asset.storage_path);
        return url ? { assetId: asset.id, url } : null;
      })
      .filter((item): item is { assetId: string; url: string } => Boolean(item));

    if (urls.length !== assets.length) {
      return respond({ error: "Some files could not be unlocked. Please try again." }, 500);
    }

    return respond({ urls, expiresIn: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    console.error("Signed URL error:", safeMessage(error));
    return respond({ error: "Could not unlock these files. Please try again." }, 500);
  }
});
