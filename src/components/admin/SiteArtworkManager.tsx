import { useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { useSiteAssets } from "../../context/SiteAssetsContext";
import { useUI } from "../../context/UIContext";
import { DEMO_MODE } from "../../lib/config";
import { requireSupabase } from "../../lib/supabase";
import { SITE_SLOTS, SITE_SLOTS_BY_SECTION, type SiteSlot } from "../../lib/siteSlots";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function safeExtension(name: string): string {
  const ext = (name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "jpg";
}

/**
 * One consolidated manager for every replaceable image on the public site.
 * Slots are grouped by where they appear; no two groups control the same image.
 */
export function SiteArtworkManager() {
  const { images, refresh } = useSiteAssets();
  const { toast } = useUI();
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const customCount = SITE_SLOTS.filter((slot) => images[slot.slot]).length;

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
        await client.storage.from("thumbnails").remove([existing.data.image_path]);
      }

      await refresh();
      toast(`${slot.label} updated.`, "success");
    } catch (nextError) {
      if (uploaded) {
        await client.storage.from("thumbnails").remove([path]);
      }
      const message =
        nextError instanceof Error ? nextError.message : "Could not update this image.";
      toast(
        /site_assets/i.test(message)
          ? "Run the latest Supabase migration (site_assets) before uploading site artwork."
          : message,
        "error",
      );
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

      if (existing.data?.image_path) {
        await client.storage.from("thumbnails").remove([existing.data.image_path]);
      }

      await refresh();
      toast(`${slot.label} reset to default.`, "success");
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Could not reset this image.";
      toast(
        /site_assets/i.test(message)
          ? "Run the latest Supabase migration (site_assets) before managing site artwork."
          : message,
        "error",
      );
    } finally {
      setBusy(null);
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
        image in one place — uploading here never creates a duplicate section.
      </p>

      {DEMO_MODE && (
        <div className="admin-demo-notice">
          <ImagePlus size={19} />
          <div>
            <strong>Demo mode.</strong> Connect Supabase and mark your profile as admin to
            upload site artwork.
          </div>
        </div>
      )}

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
