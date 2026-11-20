import { DEMO_MODE, FUNCTION_BASE, SUPABASE_URL } from "./config";
import { MOCK_SETS } from "../data/mockData";
import { requireSupabase, supabase } from "./supabase";
import { normalizeAccessLevel } from "./access";
import type { AccessLevel, MediaAsset, MediaSet, PatreonConnection, SignedAsset } from "./types";

const THUMBNAIL_BUCKET = "thumbnails";
const SIGNED_URL_BATCH = 100;

/**
 * True when a stored path is already a full remote URL. Files can be hosted on
 * a third-party site and pasted into the admin dashboard, so these values are
 * served as-is instead of being turned into a storage URL or signed link.
 */
export function isExternalUrl(value: string | null | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function thumbnailUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (isExternalUrl(path) || path.startsWith("/")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${THUMBNAIL_BUCKET}/${path.replace(/^\//, "")}`;
}

/**
 * Admin-uploaded replacements for homepage posters and section banners.
 * Missing table / offline / demo mode all resolve to an empty map so every
 * component keeps using the artwork bundled with the site.
 */
export async function fetchSiteAssets(): Promise<Record<string, string>> {
  if (DEMO_MODE || !supabase) return {};

  const { data, error } = await supabase
    .from("site_assets")
    .select("slot, image_path, updated_at");

  if (error) return {};

  return Object.fromEntries(
    (data ?? []).map((row) => {
      const stored = row.image_path as string;
      const url = thumbnailUrl(stored);
      if (!url) return [row.slot as string, ""];
      // Only bucket uploads need cache busting. Third-party links are served
      // exactly as pasted so signed CDN URLs are never altered.
      if (isExternalUrl(stored)) return [row.slot as string, url];
      const version = row.updated_at ? String(row.updated_at) : "";
      const separator = url.includes("?") ? "&" : "?";
      return [row.slot as string, version ? `${url}${separator}v=${encodeURIComponent(version)}` : url];
    }),
  );
}

function inferCategory(row: Record<string, unknown>): MediaSet["category"] {
  const value = row.category;
  if (value === "animation" || value === "arts" || value === "games" || value === "comics") {
    return value;
  }
  if (row.primary_type === "pdf") return "comics";
  if (row.primary_type === "image" || row.primary_type === "funscript") return "arts";
  return "animation";
}

function normalizeSet(row: Record<string, unknown>): MediaSet {
  return {
    ...(row as unknown as MediaSet),
    category: inferCategory(row),
    access_level: normalizeAccessLevel(row.access_level),
    asset_count: Number(row.asset_count ?? 0),
  };
}

export async function fetchMediaSets(): Promise<MediaSet[]> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return MOCK_SETS;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("media_sets")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeSet);
}

export async function fetchAllMediaSets(): Promise<MediaSet[]> {
  if (DEMO_MODE) return MOCK_SETS;
  const client = requireSupabase();
  const { data, error } = await client
    .from("media_sets")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeSet);
}

export async function fetchSetAssets(setId: string): Promise<MediaAsset[]> {
  if (DEMO_MODE) {
    const set = MOCK_SETS.find((item) => item.id === setId);
    return (set?.demo_assets ?? []).map((asset) => ({ ...asset, set_id: setId }));
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("media_assets")
    .select("*")
    .eq("set_id", setId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MediaAsset[];
}

/**
 * Asks the Edge Function for a short-lived signed URL. The function re-checks
 * the caller's membership server-side on every request, so a URL can never be
 * minted from the browser without an active entitlement.
 */
export async function getSignedAssetUrl(
  asset: MediaAsset,
  options: { download?: boolean } = {},
): Promise<SignedAsset> {
  // Third-party hosted files are already public links: no signing required.
  if (isExternalUrl(asset.storage_path)) {
    return { asset, url: asset.storage_path, expiresIn: 0 };
  }

  if (DEMO_MODE) {
    if (!asset.demo_url) throw new Error("This demo asset is unavailable.");
    return { asset, url: asset.demo_url, expiresIn: 3600 };
  }

  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in with Patreon to continue.");

  const response = await fetch(`${FUNCTION_BASE}/media-signed-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assetId: asset.id, download: Boolean(options.download) }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    expiresIn?: number;
    error?: string;
  };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Could not unlock this file. Please try again.");
  }

  return { asset, url: payload.url, expiresIn: payload.expiresIn ?? 300 };
}

export async function getSignedAssetUrls(
  assets: MediaAsset[],
): Promise<Record<string, string>> {
  if (!assets.length) return {};

  // Split third-party links from private-bucket files. Remote links are used
  // directly; only the private files need a signed URL from the Edge Function.
  const external = Object.fromEntries(
    assets
      .filter((asset) => isExternalUrl(asset.storage_path))
      .map((asset) => [asset.id, asset.storage_path]),
  );
  const internal = assets.filter((asset) => !isExternalUrl(asset.storage_path));

  if (!internal.length) return external;

  if (DEMO_MODE) {
    const demo = Object.fromEntries(
      internal
        .filter((asset) => asset.demo_url)
        .map((asset) => [asset.id, asset.demo_url as string]),
    );
    return { ...external, ...demo };
  }

  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in with Patreon to continue.");

  // The Edge Function signs at most 100 files per request. Large galleries are
  // signed in batches so a set with hundreds of images still unlocks in full.
  const signed: Record<string, string> = {};
  for (let start = 0; start < internal.length; start += SIGNED_URL_BATCH) {
    const batch = internal.slice(start, start + SIGNED_URL_BATCH);
    const response = await fetch(`${FUNCTION_BASE}/media-signed-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assetIds: batch.map((asset) => asset.id) }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      urls?: Array<{ assetId: string; url: string }>;
      error?: string;
    };

    if (!response.ok || !payload.urls) {
      throw new Error(payload.error || "Could not unlock this set. Please try again.");
    }

    for (const item of payload.urls) signed[item.assetId] = item.url;
  }

  return { ...external, ...signed };
}

/**
 * Grid thumbnail helper. Supabase can render a resized copy of a signed object
 * through its image endpoint, so galleries stay fast without ever using a
 * thumbnail as the full-size viewing image. If transformations are unavailable
 * the caller falls back to the original signed URL.
 */
export function galleryThumbnailUrl(url: string, width = 720): string {
  if (!url) return url;
  const marker = "/storage/v1/object/sign/";
  if (!url.includes(marker)) return url;
  const rendered = url.replace(marker, "/storage/v1/render/image/sign/");
  const separator = rendered.includes("?") ? "&" : "?";
  return `${rendered}${separator}width=${width}&quality=72&resize=contain`;
}

export async function downloadAsset(asset: MediaAsset): Promise<void> {
  const { url } = await getSignedAssetUrl(asset, { download: true });
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = asset.file_name || "download";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function patreonLoginUrl(returnTo = "/auth/callback"): string {
  const origin = window.location.origin;
  const redirect = `${origin}${returnTo}`;
  return `${FUNCTION_BASE}/patreon-oauth?action=start&returnTo=${encodeURIComponent(redirect)}`;
}

/* ----------------------------------------------------------------------------
 * Patreon account connection
 * ----------------------------------------------------------------------------
 * Connection status is read through RLS with an explicit column list. Token
 * columns are not granted to authenticated clients, so they are never exposed.
 */

const CONNECTION_COLUMNS = [
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

export class PatreonFunctionError extends Error {
  code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "PatreonFunctionError";
    this.code = code;
  }
}

async function callPatreonFunction<T>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in to continue.");

  const response = await fetch(`${FUNCTION_BASE}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new PatreonFunctionError(
      payload.error || "Patreon request failed. Please try again.",
      payload.code ?? null,
    );
  }

  return payload as T;
}

export async function fetchPatreonConnection(): Promise<PatreonConnection | null> {
  if (DEMO_MODE) return null;
  const client = requireSupabase();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await client
    .from("patreon_connections")
    .select(CONNECTION_COLUMNS)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PatreonConnection | null) ?? null;
}

/** Asks the backend for a Patreon authorize URL bound to this user's session. */
export async function startPatreonConnect(returnTo = "/account"): Promise<string> {
  const payload = await callPatreonFunction<{ url?: string }>("patreon-auth", { returnTo });
  if (!payload.url) throw new Error("Patreon did not return an authorization URL.");
  return payload.url;
}

export async function disconnectPatreon(): Promise<void> {
  await callPatreonFunction<{ ok: boolean }>("patreon-disconnect");
}

export async function syncPatreonConnection(): Promise<{
  connection: PatreonConnection;
  accessLevel: AccessLevel;
}> {
  return callPatreonFunction<{
    connection: PatreonConnection;
    accessLevel: AccessLevel;
  }>("patreon-sync");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
