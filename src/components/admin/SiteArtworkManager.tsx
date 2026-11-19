import { useRef, useState } from "react";
import {
  ImagePlus,
  Link2,
  ListPlus,
  Loader2,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { useSiteAssets } from "../../context/SiteAssetsContext";
import { useUI } from "../../context/UIContext";
import { isExternalUrl } from "../../lib/api";
import { DEMO_MODE } from "../../lib/config";
import { requireSupabase } from "../../lib/supabase";
import {
  SITE_SECTIONS,
  SITE_SLOTS,
  SITE_SLOTS_BY_SECTION,
  type SiteSection,
  type SiteSlot,
} from "../../lib/siteSlots";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Banner groups that the bulk “apply to every banner” tool targets. */
const BANNER_SECTIONS: SiteSection[] = ["sections", "browse"];

const BULK_TARGETS: Array<{ value: string; label: string; sections: SiteSection[] }> = [
  {
    value: "banners",
    label: "All banner slots (sections + browse)",
    sections: BANNER_SECTIONS,
  },
  ...SITE_SECTIONS.map((section) => ({
    value: section.id,
    label: section.title,
    sections: [section.id],
  })),
];

function safeExtension(name: string): string {
  const ext = (name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "jpg";
}

/** Accepts only absolute http(s) links so the browser never gets a broken src. */
function normalizeImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function migrationMessage(message: string, fallback: string): string {
  return /site_assets/i.test(message)
    ? "Run the latest Supabase migration (site_assets) before managing site artwork."
    : fallback;
}

/**
 * One consolidated manager for every replaceable image on the public site.
 * Slots are grouped by where they appear; no two groups control the same image.
 * Images can be uploaded to the bucket or pasted as third-party links.
 */
export function SiteArtworkManager() {
  const { images, refresh } = useSiteAssets();
  const { toast } = useUI();
  const [busy, setBusy] = useState<string | null>(null);
  const [urlSlot, setUrlSlot] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [bulkTarget, setBulkTarget] = useState("banners");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const customCount = SITE_SLOTS.filter((slot) => images[slot.slot]).length;

  /** Deletes the previous bucket file, but never tries to delete remote links. */
  async function removeStoredFile(client: ReturnType<typeof requireSupabase>, path?: string | null) {
    if (!path || isExternalUrl(path)) return;
    await client.storage.from("thumbnails").remove([path]);
  }

  async function saveUrl(slot: SiteSlot, raw: string): Promise<boolean> {
    const url = normalizeImageUrl(raw);
    if (!url) {
      toast("Paste a full image link that starts with http:// or https://.", "error");
      return false;
    }
    if (DEMO_MODE) {
      toast("Demo mode: connect Supabase to manage site artwork.", "error");
      return false;
    }

    setBusy(slot.slot);
    const client = requireSupabase();
    try {
      const existing = await client
        .from("site_assets")
        .select("image_path")
        .eq("slot", slot.slot)
        .maybeSingle();

      const upsert = await client.from("site_assets").upsert(
        {
          slot: slot.slot,
          section: slot.section,
          label: slot.label,
          image_path: url,
        },
        { onConflict: "slot" },
      );
      if (upsert.error) throw upsert.error;

      if (existing.data?.image_path && existing.data.image_path !== url) {
        await removeStoredFile(client, existing.data.image_path);
      }

      await refresh();
      toast(`${slot.label} updated from link.`, "success");
      return true;
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Could not update this image.";
      toast(migrationMessage(message, message), "error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleUpload(slot: SiteSlot, file: File) {
    if (DEMO_MODE) {
      toast("Demo mode: connect Supabase to manage site artwork.", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file (PNG, JPG, WebP or GIF).", "error");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast("Images must be 10 MB or smaller.", "error");
      return;
    }

    setBusy(slot.slot);
    const client = requireSupabase();
    const path = `site/${slot.slot}-${crypto.randomUUID()}.${safeExtension(file.name)}`;
    let uploaded = false;
    try {
      const existing = await client
        .from("site_assets")
        .select("image_path")
        .eq("slot", slot.slot)
        .maybeSingle();

      const upload = await client.storage
        .from("thumbnails")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upload.error) throw upload.error;
      uploaded = true;

      const upsert = await client.from("site_assets").upsert(
        {
          slot: slot.slot,
          section: slot.section,
          label: slot.label,
          image_path: path,
        },
        { onConflict: "slot" },
      );
      if (upsert.error) throw upsert.error;

      if (existing.data?.image_path && existing.data.image_path !== path) {
        await removeStoredFile(client, existing.data.image_path);
      }

      await refresh();
      toast(`${slot.label} updated.`, "success");
    } catch (nextError) {
      if (uploaded) {
        await client.storage.from("thumbnails").remove([path]);
      }
      const message =
        nextError instanceof Error ? nextError.message : "Could not update this image.";
      toast(migrationMessage(message, message), "error");
    } finally {
      setBusy(null);
      const input = inputs.current[slot.slot];
      if (input) input.value = "";
    }
  }

  async function handleReset(slot: SiteSlot) {
    if (DEMO_MODE) {
      toast("Demo mode: connect Supabase to manage site artwork.", "error");
      return;
    }
    if (!window.confirm(`Reset “${slot.label}” to the bundled artwork?`)) return;

    setBusy(slot.slot);
    const client = requireSupabase();
    try {
      const existing = await client
        .from("site_assets")
        .select("image_path")
        .eq("slot", slot.slot)
        .maybeSingle();

      const remove = await client.from("site_assets").delete().eq("slot", slot.slot);
      if (remove.error) throw remove.error;

      await removeStoredFile(client, existing.data?.image_path);

      await refresh();
      toast(`${slot.label} reset to default.`, "success");
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Could not reset this image.";
      toast(migrationMessage(message, message), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleBulkApply() {
    const target = BULK_TARGETS.find((item) => item.value === bulkTarget);
    if (!target) return;

    const slots = SITE_SLOTS.filter((slot) => target.sections.includes(slot.section));
    const lines = bulkValue
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!slots.length) {
      toast("No banner slots found for that target.", "error");
      return;
    }
    if (!lines.length) {
      toast("Paste at least one image link.", "error");
      return;
    }

    const urls = lines.length === 1 ? slots.map(() => lines[0]) : lines;
    if (urls.length !== slots.length) {
      toast(
        `Paste 1 link to use everywhere, or exactly ${slots.length} links (one per slot).`,
        "error",
      );
      return;
    }

    const invalid = urls.find((line) => !normalizeImageUrl(line));
    if (invalid) {
      toast(`“${invalid.slice(0, 60)}” is not a valid http(s) link.`, "error");
      return;
    }

    if (DEMO_MODE) {
      toast("Demo mode: connect Supabase to manage site artwork.", "error");
      return;
    }

    setBulkBusy(true);
    const client = requireSupabase();
    try {
      const previous = await client
        .from("site_assets")
        .select("slot, image_path")
        .in("slot", slots.map((slot) => slot.slot));
      if (previous.error) throw previous.error;

      const upsert = await client.from("site_assets").upsert(
        slots.map((slot, index) => ({
          slot: slot.slot,
          section: slot.section,
          label: slot.label,
          image_path: normalizeImageUrl(urls[index]) as string,
        })),
        { onConflict: "slot" },
      );
      if (upsert.error) throw upsert.error;

      const keep = new Set(urls.map((url) => normalizeImageUrl(url)));
      const stale = (previous.data ?? [])
        .map((row) => row.image_path as string)
        .filter((path) => path && !isExternalUrl(path) && !keep.has(path));
      if (stale.length) {
        await client.storage.from("thumbnails").remove(stale);
      }

      await refresh();
      toast(`${slots.length} slot${slots.length === 1 ? "" : "s"} updated from links.`, "success");
      setBulkValue("");
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Could not apply those links.";
      toast(migrationMessage(message, message), "error");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="admin-card admin-artwork">
      <div className="admin-card-head">
        <div>
          <p className="eyebrow">Site appearance</p>
          <h2>Artwork &amp; banners</h2>
        </div>
        <span className="admin-card-badge">
          <ImagePlus size={14} /> {customCount} custom
        </span>
      </div>

      <p className="admin-artwork-note">
        Replace the posters and banners that are already on the site. Each slot controls one
        image in one place — uploading or pasting a link here never creates a duplicate section.
        Images do not have to be hosted on this site: upload them anywhere and paste the link.
      </p>

      {DEMO_MODE && (
        <div className="admin-demo-notice">
          <ImagePlus size={19} />
          <div>
            <strong>Demo mode.</strong> Connect Supabase and mark your profile as admin to
            manage site artwork.
          </div>
        </div>
      )}

      <div className="admin-artwork-bulk">
        <div className="admin-artwork-bulk-head">
          <span className="admin-artwork-bulk-icon">
            <ListPlus size={16} />
          </span>
          <div>
            <strong>Add links to every banner slot</strong>
            <p>
              Paste one link to use it on every target, or one link per line to set each slot
              in order.
            </p>
          </div>
        </div>

        <div className="admin-artwork-bulk-body">
          <label className="field">
            <span>Target</span>
            <select
              value={bulkTarget}
              onChange={(event) => setBulkTarget(event.target.value)}
              disabled={bulkBusy}
            >
              {BULK_TARGETS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="field admin-artwork-bulk-urls">
            <span>Image links (one per line)</span>
            <textarea
              rows={3}
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              placeholder={"https://i.ibb.co/example/banner-1.png\nhttps://i.ibb.co/example/banner-2.png"}
              disabled={bulkBusy}
            />
          </label>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleBulkApply()}
            disabled={bulkBusy || DEMO_MODE || !bulkValue.trim()}
          >
            {bulkBusy ? <Loader2 size={15} className="spin" /> : <ListPlus size={15} />}
            Apply links
          </button>
        </div>
      </div>

      <div className="admin-artwork-groups">
        {SITE_SLOTS_BY_SECTION.map((section) => (
          <div className="admin-artwork-group" key={section.id}>
            <div className="admin-artwork-group-head">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>

            <div className="admin-artwork-grid">
              {section.slots.map((slot) => {
                const custom = Boolean(images[slot.slot]);
                const preview = images[slot.slot] || slot.fallback;
                const isBusy = busy === slot.slot;
                const editingUrl = urlSlot === slot.slot;

                return (
                  <article
                    className={`admin-artwork-slot${custom ? " is-custom" : ""}`}
                    key={slot.slot}
                  >
                    <div className="admin-artwork-preview" data-aspect={slot.aspect}>
                      <img src={preview} alt="" loading="lazy" />
                      <span className="admin-artwork-status">
                        {custom ? "Custom" : "Default"}
                      </span>
                    </div>

                    <div className="admin-artwork-meta">
                      <strong>{slot.label}</strong>
                      <code>{slot.slot}</code>
                    </div>

                    <div className="admin-artwork-actions">
                      <label className="btn btn--ghost btn--sm admin-artwork-upload">
                        {isBusy ? (
                          <Loader2 size={14} className="spin" />
                        ) : (
                          <UploadCloud size={14} />
                        )}
                        Replace
                        <input
                          ref={(element) => {
                            inputs.current[slot.slot] = element;
                          }}
                          type="file"
                          accept="image/*"
                          disabled={busy !== null || DEMO_MODE}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleUpload(slot, file);
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setUrlSlot(editingUrl ? null : slot.slot);
                          setUrlValue("");
                        }}
                        disabled={busy !== null || DEMO_MODE}
                      >
                        <Link2 size={13} /> Link
                      </button>

                      {custom && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void handleReset(slot)}
                          disabled={busy !== null || DEMO_MODE}
                        >
                          <RotateCcw size={13} /> Reset
                        </button>
                      )}
                    </div>

                    {editingUrl && (
                      <form
                        className="admin-artwork-url-form"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          if (await saveUrl(slot, urlValue)) {
                            setUrlSlot(null);
                            setUrlValue("");
                          }
                        }}
                      >
                        <input
                          autoFocus
                          type="url"
                          value={urlValue}
                          onChange={(event) => setUrlValue(event.target.value)}
                          placeholder="https://example.com/image.png"
                          disabled={isBusy}
                          aria-label={`Image link for ${slot.label}`}
                        />
                        <button
                          type="submit"
                          className="btn btn--primary btn--sm"
                          disabled={isBusy || !urlValue.trim()}
                        >
                          {isBusy ? <Loader2 size={13} className="spin" /> : "Save"}
                        </button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
