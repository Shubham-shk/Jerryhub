import { DEMO_MODE } from "./config";
import { requireSupabase } from "./supabase";

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
