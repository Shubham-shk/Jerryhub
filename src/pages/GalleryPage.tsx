import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Images,
  Loader2,
  Lock,
  Maximize2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMediaSets } from "../hooks/useMediaSets";
import {
  downloadAsset,
  fetchSetAssets,
  galleryThumbnailUrl,
  getSignedAssetUrls,
} from "../lib/api";
import { accessLabel, canAccessLevel } from "../lib/access";
import { FULL_PRICE_LABEL } from "../lib/config";
import type { MediaAsset } from "../lib/types";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Dedicated full-page image gallery. The grid lives at /gallery/:slug and the
 * distraction-free viewer at /gallery/:slug/:assetId. No modal, no sidebar and
 * no generic filenames: images are browsed visually and opened at full quality.
 */
export function GalleryPage() {
  const { slug = "", assetId } = useParams<{ slug: string; assetId?: string }>();
  const navigate = useNavigate();
  const { accessLevel, profile, isBasic } = useAuth();
  const { openAuthModal, toast } = useUI();
  const { sets, loading: setsLoading, error: setsError, reload: reloadSets } = useMediaSets();

  const set = useMemo(
    () => sets.find((item) => item.slug === slug || item.id === slug) ?? null,
    [sets, slug],
  );

  const [images, setImages] = useState<MediaAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const allowed = set ? canAccessLevel(accessLevel, set.access_level) : false;

  useEffect(() => {
    if (!set) return;
    if (!profile || !allowed) {
      setImages([]);
      setUrls({});
      setAssetsLoading(false);
      setUrlsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setAssetsLoading(true);
    setUrlsLoading(false);
    setError(null);
    setImages([]);
    setUrls({});

    fetchSetAssets(set.id)
      .then(async (nextAssets) => {
        if (cancelled) return;
        const nextImages = nextAssets.filter((asset) => asset.type === "image");
        setImages(nextImages);
        setAssetsLoading(false);

        if (!nextImages.length) return;

        setUrlsLoading(true);
        try {
          const signed = await getSignedAssetUrls(nextImages);
          if (!cancelled) setUrls(signed);
        } catch (nextError) {
          if (!cancelled) {
            setError(errorMessage(nextError, "Could not unlock this gallery."));
          }
        } finally {
          if (!cancelled) setUrlsLoading(false);
        }
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(errorMessage(nextError, "Could not load this gallery."));
        setAssetsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [set, profile, allowed, reloadKey]);

  const viewerIndex = assetId
    ? images.findIndex((image) => image.id === assetId)
    : -1;
  const viewerImage = viewerIndex >= 0 ? images[viewerIndex] : null;

  useEffect(() => {
    setDimensions(null);
    setImageFailed(false);
  }, [viewerImage?.id]);

  const goTo = useCallback(
    (index: number) => {
      if (!images.length) return;
      const next = (index + images.length) % images.length;
      navigate(`/gallery/${slug}/${images[next].id}`, { replace: true });
    },
    [images, navigate, slug],
  );

  useEffect(() => {
    if (!viewerImage) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo(viewerIndex + 1);
      if (event.key === "ArrowLeft") goTo(viewerIndex - 1);
      if (event.key === "Escape") navigate(`/gallery/${slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerImage, viewerIndex, goTo, navigate, slug]);

  // Warm the neighbouring full-resolution images so next/previous feels instant.
  useEffect(() => {
    if (!viewerImage || images.length < 2) return;
    const neighbours = [
      images[(viewerIndex - 1 + images.length) % images.length],
      images[(viewerIndex + 1) % images.length],
    ];
    for (const image of neighbours) {
      const url = urls[image.id];
      if (url) {
        const preload = new window.Image();
        preload.src = url;
      }
    }
  }, [viewerImage, viewerIndex, images, urls]);

  useDocumentTitle(set ? `${set.title} — Gallery` : "Gallery");

  async function handleDownload(asset: MediaAsset) {
    setDownloadingId(asset.id);
    try {
      await downloadAsset(asset);
      toast("Download started.", "success");
    } catch (nextError) {
      toast(errorMessage(nextError, "Download failed."), "error");
    } finally {
      setDownloadingId(null);
    }
  }

  if (setsLoading && !set) {
    return (
      <div className="gallery-page gallery-page--centered">
        <div className="gallery-loading">
          <Loader2 size={30} className="spin" />
          <p>Opening gallery…</p>
        </div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="gallery-page gallery-page--centered">
        <div className="gallery-gate">
          <span className="gallery-gate-icon">
            {setsError ? <AlertTriangle size={28} /> : <Images size={28} />}
          </span>
          <h1>{setsError ? "Could not load the library" : "Set not found"}</h1>
          <p>
            {setsError
              ? "The gallery could not be loaded. Check your connection and try again."
              : "This gallery may have been moved or unpublished."}
          </p>
          {setsError ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void reloadSets()}
            >
              Try again
            </button>
          ) : (
            <Link to="/browse" className="btn btn--primary btn--sm">
              <ArrowLeft size={15} /> Back to library
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="gallery-page gallery-page--centered">
        <div className="gallery-gate">
          <span className="gallery-gate-icon"><Lock size={28} /></span>
          <p className="eyebrow">Members only</p>
          <h1>{set.title}</h1>
          <p>Sign in with Patreon to open this image set.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openAuthModal("locked")}
          >
            Unlock with Patreon
          </button>
          <Link to="/browse" className="gallery-gate-back">
            <ArrowLeft size={14} /> Back to library
          </Link>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="gallery-page gallery-page--centered">
        <div className="gallery-gate">
          <span className="gallery-gate-icon"><Lock size={28} /></span>
          <p className="eyebrow">{accessLabel(set.access_level)}</p>
          <h1>{set.title}</h1>
          <p>
            {set.access_level === "full"
              ? `This set is included with Full Access — ${FULL_PRICE_LABEL}.`
              : "Your Patreon membership is not active. Update your pledge to regain access."}
          </p>
          {set.access_level === "full" && isBasic ? (
            <a className="btn btn--primary" href="/#pricing">
              <Sparkles size={16} /> Upgrade to Full Access
            </a>
          ) : (
            <Link to="/account" className="btn btn--primary">
              Check membership status
            </Link>
          )}
          <Link to="/browse" className="gallery-gate-back">
            <ArrowLeft size={14} /> Back to library
          </Link>
        </div>
      </div>
    );
  }

  const imageCount = images.length;
  const currentIndex = viewerIndex >= 0 ? viewerIndex : 0;
  const currentUrl = viewerImage ? urls[viewerImage.id] : undefined;

  if (assetId) {
    if (assetsLoading) {
      return (
        <div className="gallery-page gallery-page--centered">
          <div className="gallery-loading">
            <Loader2 size={28} className="spin" />
            <p>Opening image…</p>
          </div>
        </div>
      );
    }

    if (!viewerImage) {
      return (
        <div className="gallery-page gallery-page--centered">
          <div className="gallery-gate">
            <span className="gallery-gate-icon"><Images size={28} /></span>
            <h1>Image not found</h1>
            <p>This image is no longer part of the set.</p>
            <Link to={`/gallery/${slug}`} className="btn btn--primary btn--sm">
              <ArrowLeft size={15} /> Back to gallery
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="gallery-viewer">
        <header className="gallery-viewer-bar">
          <div className="gallery-viewer-bar-left">
            <Link to={`/gallery/${slug}`} className="gallery-back">
              <ArrowLeft size={16} /> Gallery
            </Link>
            <span className="gallery-viewer-title">{set.title}</span>
          </div>
          <div className="gallery-viewer-bar-right">
            <span className="gallery-viewer-count">
              {currentIndex + 1} <span>/</span> {imageCount}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={!viewerImage || downloadingId === viewerImage.id}
              onClick={() => viewerImage && void handleDownload(viewerImage)}
            >
              {viewerImage && downloadingId === viewerImage.id ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Download size={15} />
              )}
              <span>Download</span>
            </button>
          </div>
        </header>

        <div className="gallery-viewer-stage">
          {imageCount > 1 && (
            <button
              type="button"
              className="gallery-viewer-arrow gallery-viewer-arrow--left"
              onClick={() => goTo(viewerIndex - 1)}
              aria-label="Previous image"
            >
              <ChevronLeft size={26} />
            </button>
          )}

          <div className="gallery-viewer-frame">
            {error ? (
              <div className="gallery-viewer-message">
                <AlertTriangle size={30} />
                <p>{error}</p>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : currentUrl && !imageFailed ? (
              <img
                key={viewerImage?.id}
                src={currentUrl}
                alt=""
                className="gallery-viewer-image"
                decoding="async"
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth && image.naturalHeight) {
                    setDimensions({
                      width: image.naturalWidth,
                      height: image.naturalHeight,
                    });
                  }
                }}
                onError={() => setImageFailed(true)}
              />
            ) : urlsLoading || assetsLoading ? (
              <div className="gallery-viewer-message">
                <Loader2 size={28} className="spin" />
                <p>Loading full-resolution image…</p>
              </div>
            ) : (
              <div className="gallery-viewer-message">
                <AlertTriangle size={30} />
                <p>This image could not be loaded.</p>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setImageFailed(false);
                    setReloadKey((value) => value + 1);
                  }}
                >
                  Reload
                </button>
              </div>
            )}
          </div>

          {imageCount > 1 && (
            <button
              type="button"
              className="gallery-viewer-arrow gallery-viewer-arrow--right"
              onClick={() => goTo(viewerIndex + 1)}
              aria-label="Next image"
            >
              <ChevronRight size={26} />
            </button>
          )}
        </div>

        <footer className="gallery-viewer-foot">
          <span className="gallery-viewer-resolution">
            {dimensions
              ? `${dimensions.width} × ${dimensions.height}`
              : "Original resolution"}
          </span>
          <span className="gallery-viewer-hint">
            <kbd>←</kbd> <kbd>→</kbd> to browse · <kbd>Esc</kbd> for the gallery
          </span>
          <span className="gallery-viewer-access">
            <ShieldCheck size={13} /> {accessLabel(set.access_level)}
          </span>
        </footer>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div className="container gallery-header-inner">
          <nav className="gallery-breadcrumb" aria-label="Breadcrumb">
            <Link to="/browse" className="gallery-back">
              <ArrowLeft size={15} /> All sets
            </Link>
            <span className="gallery-breadcrumb-sep">/</span>
            <span className="gallery-breadcrumb-current">{set.title}</span>
          </nav>

          <div className="gallery-title-row">
            <div className="gallery-title-copy">
              <p className="eyebrow"><Images size={14} /> Image set</p>
              <h1>{set.title}</h1>
              <div className="gallery-meta">
                <span>
                  {assetsLoading
                    ? "Loading images…"
                    : `${imageCount} ${imageCount === 1 ? "image" : "images"}`}
                </span>
                <span><Maximize2 size={12} /> Original resolution</span>
                <span className="gallery-meta-access">{accessLabel(set.access_level)}</span>
              </div>
            </div>
            <div className="gallery-header-actions">
              <Link to={`/content/${set.slug}`} className="btn btn--ghost btn--sm">
                Release details
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="gallery-content">
        <div className="container">
          {assetsLoading ? (
            <div className="gallery-loading">
              <Loader2 size={26} className="spin" />
              <p>Loading images…</p>
            </div>
          ) : error ? (
            <div className="gallery-state">
              <AlertTriangle size={28} />
              <h2>We couldn&apos;t open this gallery.</h2>
              <p>{error}</p>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : !imageCount ? (
            <div className="gallery-state">
              <Images size={28} />
              <h2>No images yet</h2>
              <p>This set has no images. Check back soon.</p>
            </div>
          ) : (
            <>
              {urlsLoading && (
                <div className="gallery-url-note">
                  <Loader2 size={14} className="spin" /> Unlocking secure images…
                </div>
              )}
              <div className="gallery-masonry">
                {images.map((image, index) => {
                  const original = urls[image.id];
                  return (
                    <Link
                      key={image.id}
                      to={`/gallery/${slug}/${image.id}`}
                      className="gallery-card"
                      aria-label={`Open image ${index + 1} of ${imageCount}`}
                    >
                      {original ? (
                        <img
                          src={galleryThumbnailUrl(original)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            const img = event.currentTarget;
                            if (img.dataset.fallback === "1") return;
                            img.dataset.fallback = "1";
                            img.src = original;
                          }}
                        />
                      ) : (
                        <span className="gallery-card-placeholder">
                          <Loader2 size={20} className="spin" />
                        </span>
                      )}
                      <span className="gallery-card-index">{index + 1}</span>
                      <span className="gallery-card-open">
                        <Maximize2 size={16} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
