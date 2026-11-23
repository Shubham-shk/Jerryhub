import { DEMO_MODE } from "./config";
import { requireSupabase } from "./supabase";
import type { AccessLevel } from "./types";

/* ----------------------------------------------------------------------------
 * Sets & Packs CMS
 * ----------------------------------------------------------------------------
 * Sets are reusable image albums. Packs are independent content packs that can
 * be assigned to a set; every pack assigned to the same set shares that album.
 * Supabase is the single source of truth for every read and write.
 */

export interface ContentSet {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /**
   * The storefront media_sets row this album publishes as. Null means the album
   * is still private and nothing in it appears on the public site.
   */
  media_set_id: string | null;
  /** Homepage collection the album publishes into. */
  category: "animation" | "arts" | "games" | "comics";
  /**
   * Membership level required to open this album. Mirrored onto the linked
   * media_sets row, which is what the storefront and the signed-URL function
   * actually enforce.
   */
  access_level: AccessLevel;
}

export interface ContentPack {
  id: string;
  name: string;
  set_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SetImage {
  id: string;
  set_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function client() {
  if (DEMO_MODE) {
    throw new Error("Connect Supabase to manage sets and packs.");
  }
  return requireSupabase();
}

function requireName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error("Name cannot be empty.");
  if (name.length > 80) throw new Error("Names must be 80 characters or fewer.");
  return name;
}

/** Accepts only absolute http(s) links so the browser never gets a broken src. */
export function normalizeImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Produces the next generic name: Set 1, Set 2, Pack 1, ...
 * Custom names are skipped and collisions are avoided.
 */
export function nextDefaultName(
  prefix: "Set" | "Pack",
  existingNames: string[],
): string {
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  const pattern = new RegExp(`^${prefix}\\s+(\\d+)$`, "i");
  let highest = 0;
  for (const name of existingNames) {
    const match = name.trim().match(pattern);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  let next = Math.max(highest + 1, existingNames.length + 1, 1);
  while (taken.has(`${prefix} ${next}`.toLowerCase())) next += 1;
  return `${prefix} ${next}`;
}

/* ------------------------------- Sets ------------------------------------ */

export async function fetchContentSets(): Promise<ContentSet[]> {
  if (DEMO_MODE) return [];
  const { data, error } = await client()
    .from("content_sets")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContentSet[];
}

export async function fetchContentSet(setId: string): Promise<ContentSet | null> {
  if (DEMO_MODE) return null;
  const { data, error } = await client()
    .from("content_sets")
    .select("*")
    .eq("id", setId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ContentSet | null) ?? null;
}

export async function createContentSet(name?: string): Promise<ContentSet> {
  const sets = await fetchContentSets();
  const finalName = name?.trim()
    ? requireName(name)
    : nextDefaultName("Set", sets.map((set) => set.name));
  const sortOrder = sets.reduce((max, set) => Math.max(max, set.sort_order), 0) + 1;

  const { data, error } = await client()
    .from("content_sets")
    .insert({ name: finalName, sort_order: sortOrder })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContentSet;
}

export async function renameContentSet(setId: string, name: string): Promise<ContentSet> {
  const { data, error } = await client()
    .from("content_sets")
    .update({ name: requireName(name) })
    .eq("id", setId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContentSet;
}

/**
 * Links an album to the storefront set it publishes as. Passing null unpublishes
 * the album without deleting any images.
 */
export async function linkContentSetToMediaSet(
  setId: string,
  mediaSetId: string | null,
): Promise<ContentSet> {
  const { data, error } = await client()
    .from("content_sets")
    .update({ media_set_id: mediaSetId })
    .eq("id", setId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContentSet;
}

/** Returns the album linked to a storefront set, if one exists. */
export async function fetchContentSetForMediaSet(
  mediaSetId: string,
): Promise<ContentSet | null> {
  if (DEMO_MODE) return null;
  const { data, error } = await client()
    .from("content_sets")
    .select("*")
    .eq("media_set_id", mediaSetId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ContentSet | null) ?? null;
}

/**
 * Guarantees an album is visible on the public site.
 *
 * An album with no `media_set_id` is invisible to every storefront query, which
 * is exactly why images added in the Sets area never appeared. This creates the
 * storefront row on first use and links it, so the album shows up in the NSFW
 * Image Sets row, Trending, the gallery and the comics row immediately.
 */
export async function ensureMediaSetForContentSet(
  set: ContentSet,
  options: { category?: "arts" | "comics" | "animation" | "games" } = {},
): Promise<string> {
  if (set.media_set_id) return set.media_set_id;
  if (DEMO_MODE) throw new Error("Connect Supabase to publish albums.");

  // The database trigger publishes albums as soon as an image is inserted, so
  // the caller's copy of the album can be a few milliseconds stale. Re-read it
  // first and reuse the listing the trigger already created instead of making a
  // duplicate storefront set.
  const fresh = await fetchContentSet(set.id);
  if (fresh?.media_set_id) return fresh.media_set_id;
  if (fresh) set = fresh;

  const db = client();
  const category = options.category ?? set.category ?? "arts";
  const slugBase =
    set.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "set";
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  const images = await fetchSetImages(set.id);
  if (!images.length) {
    throw new Error("Add at least one image before publishing this album.");
  }
  const cover = images[0].image_url;

  const { data, error } = await db
    .from("media_sets")
    .insert({
      slug,
      title: set.name,
      description: null,
      thumbnail_path: cover,
      primary_type: category === "comics" ? "pdf" : "image",
      category,
      access_level: set.access_level ?? "full",
      published: true,
      is_new: true,
      is_trending: false,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const mediaSetId = data.id as string;
  await linkContentSetToMediaSet(set.id, mediaSetId);
  return mediaSetId;
}

/** Toggles the Trending flag on the storefront listing an album publishes as. */
export async function setContentSetTrending(
  set: ContentSet,
  trending: boolean,
): Promise<void> {
  const db = client();
  const mediaSetId = set.media_set_id ?? (await ensureMediaSetForContentSet(set));
  const { error } = await db
    .from("media_sets")
    .update({ is_trending: trending })
    .eq("id", mediaSetId);
  if (error) throw new Error(error.message);
}

export interface ContentSetPublication {
  id: string;
  is_trending: boolean;
  is_new: boolean;
  published: boolean;
  asset_count: number;
}

/** Storefront state of the media set an album publishes as, if any. */
export async function fetchContentSetPublication(
  setId: string,
): Promise<ContentSetPublication | null> {
  if (DEMO_MODE) return null;
  const album = await fetchContentSet(setId);
  if (!album?.media_set_id) return null;
  const { data, error } = await client()
    .from("media_sets")
    .select("id, is_trending, is_new, published, asset_count")
    .eq("id", album.media_set_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    is_trending: Boolean(data.is_trending),
    is_new: Boolean(data.is_new),
    published: Boolean(data.published),
    asset_count: Number(data.asset_count ?? 0),
  };
}

/**
 * Moves an already-published album into a different homepage collection and
 * keeps the storefront row in sync.
 */
export async function setContentSetCategory(
  setId: string,
  category: "animation" | "arts" | "games" | "comics",
): Promise<void> {
  const db = client();
  const { data, error } = await db
    .from("content_sets")
    .update({ category })
    .eq("id", setId)
    .select("media_set_id")
    .single();
  if (error) throw new Error(error.message);

  const mediaSetId = (data as { media_set_id: string | null }).media_set_id;
  if (!mediaSetId) return;

  const { error: mediaError } = await db
    .from("media_sets")
    .update({
      category,
      primary_type: category === "comics" ? "pdf" : "image",
    })
    .eq("id", mediaSetId);
  if (mediaError) throw new Error(mediaError.message);
}

/**
 * Sets the membership level an album requires and keeps its storefront row in
 * sync. The database trigger mirrors the value too; writing both here means the
 * change is visible immediately even if the trigger is not deployed yet.
 */
export async function setContentSetAccess(
  setId: string,
  accessLevel: AccessLevel,
): Promise<void> {
  const db = client();
  const { data, error } = await db
    .from("content_sets")
    .update({ access_level: accessLevel })
    .eq("id", setId)
    .select("media_set_id")
    .single();
  if (error) throw new Error(error.message);

  const mediaSetId = (data as { media_set_id: string | null }).media_set_id;
  if (!mediaSetId) return;

  const { error: mediaError } = await db
    .from("media_sets")
    .update({ access_level: accessLevel })
    .eq("id", mediaSetId);
  if (mediaError) throw new Error(mediaError.message);
}

/** Album images for a storefront set, in display order. */
export async function fetchAlbumImagesForMediaSet(
  mediaSetId: string,
): Promise<SetImage[]> {
  if (DEMO_MODE) return [];
  const album = await fetchContentSetForMediaSet(mediaSetId);
  if (!album) return [];
  return fetchSetImages(album.id);
}

export async function deleteContentSet(setId: string): Promise<void> {
  const { error } = await client().from("content_sets").delete().eq("id", setId);
  if (error) throw new Error(error.message);
}

/* ------------------------------- Packs ----------------------------------- */

export async function fetchContentPacks(): Promise<ContentPack[]> {
  if (DEMO_MODE) return [];
  const { data, error } = await client()
    .from("content_packs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContentPack[];
}

export async function fetchContentPack(packId: string): Promise<ContentPack | null> {
  if (DEMO_MODE) return null;
  const { data, error } = await client()
    .from("content_packs")
    .select("*")
    .eq("id", packId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ContentPack | null) ?? null;
}

export async function createContentPack(input: {
  name?: string;
  setId?: string | null;
} = {}): Promise<ContentPack> {
  const packs = await fetchContentPacks();
  const finalName = input.name?.trim()
    ? requireName(input.name)
    : nextDefaultName("Pack", packs.map((pack) => pack.name));
  const sortOrder = packs.reduce((max, pack) => Math.max(max, pack.sort_order), 0) + 1;

  const { data, error } = await client()
    .from("content_packs")
    .insert({
      name: finalName,
      set_id: input.setId ?? null,
      sort_order: sortOrder,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContentPack;
}

export async function updateContentPack(
  packId: string,
  changes: { name?: string; setId?: string | null },
): Promise<ContentPack> {
  const payload: Record<string, unknown> = {};
  if (changes.name !== undefined) payload.name = requireName(changes.name);
  if (changes.setId !== undefined) payload.set_id = changes.setId;

  const { data, error } = await client()
    .from("content_packs")
    .update(payload)
    .eq("id", packId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContentPack;
}

export async function deleteContentPack(packId: string): Promise<void> {
  const { error } = await client().from("content_packs").delete().eq("id", packId);
  if (error) throw new Error(error.message);
}

/**
 * Creates the starter Set 1 and Pack 1 when the CMS is completely empty. This
 * keeps the default generic names visible on the first visit instead of an
 * empty dashboard. Existing content is never touched.
 */
export async function ensureStarterContent(): Promise<void> {
  const sets = await fetchContentSets();
  const firstSet = sets[0] ?? (await createContentSet());

  const packs = await fetchContentPacks();
  if (!packs.length) {
    await createContentPack({ setId: firstSet.id });
  }
}

let starterPromise: Promise<void> | null = null;

/** Runs the starter seed at most once per page session; retries after failure. */
export function ensureStarterContentOnce(): Promise<void> {
  if (!starterPromise) {
    starterPromise = ensureStarterContent().catch((error: unknown) => {
      starterPromise = null;
      throw error;
    });
  }
  return starterPromise;
}

/* ------------------------------- Images ---------------------------------- */

export async function fetchSetImages(setId: string): Promise<SetImage[]> {
  if (DEMO_MODE) return [];
  const { data, error } = await client()
    .from("set_images")
    .select("*")
    .eq("set_id", setId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SetImage[];
}

/** Image counts for every album, used by the Sets and Packs overviews. */
export async function fetchSetImageCounts(): Promise<Record<string, number>> {
  if (DEMO_MODE) return {};
  const { data, error } = await client().from("set_images").select("set_id");
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const setId = row.set_id as string;
    counts[setId] = (counts[setId] ?? 0) + 1;
  }
  return counts;
}

export async function addSetImages(setId: string, urls: string[]): Promise<SetImage[]> {
  const clean: string[] = [];
  for (const raw of urls) {
    const url = normalizeImageUrl(raw);
    if (!url) throw new Error(`“${raw.slice(0, 60)}” is not a valid http(s) image link.`);
    clean.push(url);
  }
  if (!clean.length) throw new Error("Paste at least one image link.");

  const existing = await fetchSetImages(setId);
  let sortOrder = existing.reduce((max, image) => Math.max(max, image.sort_order), 0);

  const rows = clean.map((imageUrl) => {
    sortOrder += 1;
    return { set_id: setId, image_url: imageUrl, sort_order: sortOrder };
  });

  const { data, error } = await client()
    .from("set_images")
    .insert(rows)
    .select("*");
  if (error) throw new Error(error.message);

  // Publishing is also guaranteed by a database trigger, but calling it here
  // keeps the very first admin session on an older deployed bundle in sync as
  // well. Failures must not lose the images that were just saved.
  try {
    const album = await fetchContentSet(setId);
    if (album) await ensureMediaSetForContentSet(album);
  } catch {
    // The trigger or a later "Publish album" click completes the listing.
  }

  return (data ?? []) as SetImage[];
}

export async function updateSetImageUrl(imageId: string, rawUrl: string): Promise<SetImage> {
  const imageUrl = normalizeImageUrl(rawUrl);
  if (!imageUrl) throw new Error("Enter a full image link starting with http:// or https://.");

  const { data, error } = await client()
    .from("set_images")
    .update({ image_url: imageUrl })
    .eq("id", imageId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SetImage;
}

export async function deleteSetImage(imageId: string): Promise<void> {
  const { error } = await client().from("set_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);
}

/**
 * Persists a new order after a move. The array must already be in display
 * order; sort_order is rewritten to match the index.
 */
export async function saveSetImageOrder(images: SetImage[]): Promise<void> {
  const db = client();
  const updates = images
    .map((image, index) => ({ image, index }))
    .filter(({ image, index }) => image.sort_order !== index);

  for (const { image, index } of updates) {
    const { error } = await db
      .from("set_images")
      .update({ sort_order: index })
      .eq("id", image.id);
    if (error) throw new Error(error.message);
  }
}
