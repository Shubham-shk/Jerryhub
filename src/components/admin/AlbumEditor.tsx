import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useUI } from "../../context/UIContext";
import {
  addSetImages,
  deleteSetImage,
  fetchSetImages,
  saveSetImageOrder,
  updateSetImageUrl,
  type SetImage,
} from "../../lib/contentCms";

interface AlbumEditorProps {
  setId: string | null;
  setName?: string;
  note?: string;
  emptyAction?: ReactNode;
  onAlbumChanged?: () => void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Shared album editor used by both Set pages and Pack pages. Images are stored
 * on the set, so every pack assigned to that set edits the same album.
 */
export function AlbumEditor({
  setId,
  setName,
  note,
  emptyAction,
  onAlbumChanged,
}: AlbumEditorProps) {
  const { toast } = useUI();
  const [images, setImages] = useState<SetImage[]>([]);
  const [loading, setLoading] = useState(Boolean(setId));
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!setId) {
      setImages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setImages(await fetchSetImages(setId));
    } catch (nextError) {
      setError(errorMessage(nextError, "Could not load this album."));
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewUrl]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!setId) return;
    const urls = draft
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!urls.length) {
      toast("Paste at least one image link.", "error");
      return;
    }

    setAdding(true);
    try {
      await addSetImages(setId, urls);
      setDraft("");
      toast(`${urls.length} image${urls.length === 1 ? "" : "s"} added.`, "success");
      await load();
      onAlbumChanged?.();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not add those images."), "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleSave(image: SetImage, url: string) {
    setBusyId(image.id);
    try {
      const updated = await updateSetImageUrl(image.id, url);
      setImages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast("Image link updated.", "success");
      onAlbumChanged?.();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not update this image."), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setBusyId(next[target].id);
    try {
      await saveSetImageOrder(next);
      setImages(next.map((image, position) => ({ ...image, sort_order: position })));
      onAlbumChanged?.();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not reorder the album."), "error");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(image: SetImage) {
    if (!window.confirm("Remove this image from the album?")) return;
    setBusyId(image.id);
    try {
      await deleteSetImage(image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
      toast("Image removed.", "success");
      onAlbumChanged?.();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not remove this image."), "error");
    } finally {
      setBusyId(null);
    }
  }

  if (!setId) {
    return (
      <div className="album-empty">
        <span className="album-empty-icon"><ImagePlus size={22} /></span>
        {emptyAction ?? <p>Assign a set to this pack to manage its shared album.</p>}
      </div>
    );
  }

  return (
    <div className="album">
      <div className="album-head">
        <div>
          <h2>Album images</h2>
          <p>
            {setName ? `${setName} · ` : ""}
            {images.length} image{images.length === 1 ? "" : "s"} · third-party links
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {note && <p className="album-note">{note}</p>}

      <form className="album-add" onSubmit={handleAdd}>
        <label className="field">
          <span>Add image links (one per line)</span>
          <textarea
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={"https://example.com/image-1.png\nhttps://example.com/image-2.png"}
            disabled={adding}
          />
        </label>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={adding || !draft.trim()}
        >
          {adding ? <Loader2 size={15} className="spin" /> : <ImagePlus size={15} />}
          Add images
        </button>
      </form>

      {loading ? (
        <div className="admin-loading"><Loader2 size={22} className="spin" /> Loading album…</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : images.length ? (
        <div className="album-grid">
          {images.map((image, index) => (
            <AlbumImageCard
              key={image.id}
              image={image}
              index={index}
              total={images.length}
              busy={busyId === image.id}
              onPreview={setPreviewUrl}
              onSave={(url) => void handleSave(image, url)}
              onMove={(direction) => void handleMove(index, direction)}
              onDelete={() => void handleDelete(image)}
            />
          ))}
        </div>
      ) : (
        <p className="album-empty-text">
          No images yet. Paste one or more links above to build this album.
        </p>
      )}

      {previewUrl && (
        <div
          className="album-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            className="album-lightbox-close"
            aria-label="Close preview"
            onClick={() => setPreviewUrl(null)}
          >
            <X size={20} />
          </button>
          <img
            src={previewUrl}
            alt=""
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

interface AlbumImageCardProps {
  image: SetImage;
  index: number;
  total: number;
  busy: boolean;
  onPreview: (url: string) => void;
  onSave: (url: string) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}

function AlbumImageCard({
  image,
  index,
  total,
  busy,
  onPreview,
  onSave,
  onMove,
  onDelete,
}: AlbumImageCardProps) {
  const [draft, setDraft] = useState(image.image_url);

  useEffect(() => {
    setDraft(image.image_url);
  }, [image.image_url]);

  const dirty = draft.trim() !== image.image_url;

  return (
    <article className="album-image">
      <button
        type="button"
        className="album-image-preview"
        onClick={() => onPreview(image.image_url)}
        aria-label={`Preview image ${index + 1}`}
      >
        <img src={image.image_url} alt="" loading="lazy" />
        <span className="album-image-index">{index + 1}</span>
      </button>

      <label className="album-image-url">
        <span className="sr-only">Image URL</span>
        <input
          type="url"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
          placeholder="https://example.com/image.png"
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onSave(draft)}
          disabled={busy || !dirty || !draft.trim()}
          title="Save link"
        >
          {busy ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
        </button>
      </label>

      <div className="album-image-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMove("up")}
          disabled={busy || index === 0}
          aria-label="Move image up"
          title="Move up"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onMove("down")}
          disabled={busy || index === total - 1}
          aria-label="Move image down"
          title="Move down"
        >
          <ArrowDown size={14} />
        </button>
        <a
          className="icon-btn"
          href={image.image_url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Open image in a new tab"
          title="Open full size"
        >
          <ExternalLink size={14} />
        </a>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={onDelete}
          disabled={busy}
          aria-label="Remove image"
          title="Remove image"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}
