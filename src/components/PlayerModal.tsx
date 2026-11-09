import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Image as ImageIcon,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { DEMO_MODE, FULL_PRICE_LABEL } from "../lib/config";
import { accessLabel, canAccessLevel } from "../lib/access";
import {
  downloadAsset,
  fetchSetAssets,
  formatBytes,
  getSignedAssetUrls,
  thumbnailUrl,
} from "../lib/api";
import type { MediaAsset, MediaSet, MediaType } from "../lib/types";

const typeLabels: Record<MediaType, string> = {
  video: "Video",
  image: "Image",
  pdf: "Story",
  funscript: "Funscript",
};

const typeIcons = {
  video: Play,
  image: ImageIcon,
  pdf: FileText,
  funscript: Flame,
};

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function VideoPlayer({
  src,
  poster,
  title,
  demo,
}: {
  src: string;
  poster: string;
  title: string;
  demo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setFailed(true);
      }
    } else {
      video.pause();
    }
  }, [failed]);

  function seekTo(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrent(value);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeVolume(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shell.requestFullscreen().catch(() => undefined);
  }

  function retry() {
    setFailed(false);
    setBuffering(true);
    videoRef.current?.load();
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const volumeProgress = muted ? 0 : volume * 100;

  return (
    <div
      className="video-shell"
      ref={shellRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === " ") {
          event.preventDefault();
          void togglePlay();
        }
        if (event.key === "ArrowRight") seekTo(Math.min(duration, current + 5));
        if (event.key === "ArrowLeft") seekTo(Math.max(0, current - 5));
        if (event.key.toLowerCase() === "m") toggleMute();
        if (event.key.toLowerCase() === "f") void toggleFullscreen();
      }}
    >
      <video
        ref={videoRef}
        className="video-el"
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={() => void togglePlay()}
        onDoubleClick={() => void toggleFullscreen()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setBuffering(false);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onError={() => {
          setFailed(true);
          setBuffering(false);
        }}
      />

      {demo && <span className="video-demo-badge">Demo preview</span>}

      {buffering && !failed && (
        <div className="video-center">
          <Loader2 size={34} className="spin" />
        </div>
      )}

      {!playing && !buffering && !failed && (
        <button type="button" className="video-big-play" onClick={() => void togglePlay()} aria-label="Play">
          <Play size={30} fill="currentColor" />
        </button>
      )}

      {failed && (
        <div className="video-fallback">
          <img src={poster} alt="" />
          <div className="video-fallback-body">
            <AlertTriangle size={26} />
            <p>This preview could not be loaded.</p>
            <span>In production, this stream is served from a private bucket via a signed URL.</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={retry}>
              <RotateCcw size={15} /> Try again
            </button>
          </div>
        </div>
      )}

      <div className="video-controls" onClick={(event) => event.stopPropagation()}>
        <input
          className="video-progress"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          aria-label="Seek"
          onChange={(event) => seekTo(Number(event.target.value))}
          style={{ "--pct": `${progress}%` } as CSSProperties}
        />
        <div className="video-controls-row">
          <button type="button" className="video-btn" onClick={() => void togglePlay()} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
          </button>
          <button type="button" className="video-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            className="video-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            aria-label="Volume"
            onChange={(event) => changeVolume(Number(event.target.value))}
            style={{ "--pct": `${volumeProgress}%` } as CSSProperties}
          />
          <span className="video-time">
            {clock(current)} <span>/</span> {clock(duration)}
          </span>
          <span className="video-title-mini">{title}</span>
          <button
            type="button"
            className="video-btn"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageGallery({
  images,
  urls,
  activeId,
  onChange,
  onDownload,
  downloadingId,
}: {
  images: MediaAsset[];
  urls: Record<string, string>;
  activeId: string | null;
  onChange: (id: string) => void;
  onDownload: (asset: MediaAsset) => void;
  downloadingId: string | null;
}) {
  const index = Math.max(0, images.findIndex((image) => image.id === activeId));
  const current = images[index];
  const src = current ? urls[current.id] : undefined;
  const stripRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (direction: -1 | 1) => {
      const next = (index + direction + images.length) % images.length;
      onChange(images[next].id);
    },
    [images, index, onChange],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    const strip = stripRef.current;
    const child = strip?.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index]);

  if (!current) return null;

  return (
    <div className="gallery">
      <div className="gallery-stage">
        {src ? (
          <img src={src} alt={current.file_name} className="gallery-img" />
        ) : (
          <div className="gallery-loading"><Loader2 size={28} className="spin" /></div>
        )}
        {images.length > 1 && (
          <>
            <button type="button" className="gallery-arrow gallery-arrow--left" onClick={() => go(-1)} aria-label="Previous image">
              <ChevronLeft size={24} />
            </button>
            <button type="button" className="gallery-arrow gallery-arrow--right" onClick={() => go(1)} aria-label="Next image">
              <ChevronRight size={24} />
            </button>
          </>
        )}
        <div className="gallery-topline">
          <span>{index + 1} / {images.length}</span>
          <button
            type="button"
            className="gallery-download"
            onClick={() => onDownload(current)}
            aria-label="Download this image"
          >
            {downloadingId === current.id ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <div className="gallery-strip" ref={stripRef}>
          {images.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              className={`gallery-thumb${image.id === activeId ? " is-active" : ""}`}
              onClick={() => onChange(image.id)}
              aria-label={`View image ${imageIndex + 1}`}
            >
              <img src={urls[image.id] ?? thumbnailUrl(null)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlayerModal({ set, onClose }: { set: MediaSet | null; onClose: () => void }) {
  const { accessLevel, profile, demoMode } = useAuth();
  const { toast } = useUI();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!set) return;
    let cancelled = false;
    setLoading(true);
    setUrlsLoading(false);
    setError(null);
    setAssets([]);
    setUrls({});
    setActiveId(null);

    if (!profile) {
      setError("Please sign in with Patreon to unlock this release.");
      setLoading(false);
      return;
    }

    if (!canAccessLevel(accessLevel, set.access_level)) {
      setError(
        set.access_level === "full"
          ? `This release is included with Full Access. Upgrade to Full Access — ${FULL_PRICE_LABEL} to continue.`
          : "Your Patreon membership is not active. Update your pledge to regain access.",
      );
      setLoading(false);
      return;
    }

    fetchSetAssets(set.id)
      .then(async (nextAssets) => {
        if (cancelled) return;
        setAssets(nextAssets);
        const first =
          nextAssets.find((asset) => asset.type === "video") ??
          nextAssets.find((asset) => asset.type === "image") ??
          nextAssets[0];
        setActiveId(first?.id ?? null);
        setLoading(false);

        if (nextAssets.length) {
          setUrlsLoading(true);
          try {
            const signed = await getSignedAssetUrls(nextAssets);
            if (!cancelled) setUrls(signed);
          } catch (nextError) {
            if (!cancelled) {
              setError(nextError instanceof Error ? nextError.message : "Could not unlock this set.");
            }
          } finally {
            if (!cancelled) setUrlsLoading(false);
          }
        }
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "Could not load this set.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [set, accessLevel, profile]);

  useEffect(() => {
    if (!set) return;
    document.body.classList.add("no-scroll");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKey);
    };
  }, [set, onClose]);

  const videos = useMemo(() => assets.filter((asset) => asset.type === "video"), [assets]);
  const images = useMemo(() => assets.filter((asset) => asset.type === "image"), [assets]);
  const pdfs = useMemo(() => assets.filter((asset) => asset.type === "pdf"), [assets]);
  const funscripts = useMemo(() => assets.filter((asset) => asset.type === "funscript"), [assets]);

  const activeAsset = assets.find((asset) => asset.id === activeId) ?? null;

  const sideItems = useMemo(() => {
    const items: Array<{
      key: string;
      type: MediaType;
      label: string;
      sub: string;
      asset: MediaAsset;
      count?: number;
    }> = [];
    videos.forEach((asset) => {
      items.push({ key: asset.id, type: "video", label: asset.file_name, sub: formatBytes(asset.size_bytes), asset });
    });
    if (images.length) {
      items.push({
        key: "gallery",
        type: "image",
        label: "Image gallery",
        sub: `${images.length} ${images.length === 1 ? "image" : "images"}`,
        asset: images[0],
        count: images.length,
      });
    }
    pdfs.forEach((asset) => {
      items.push({ key: asset.id, type: "pdf", label: asset.file_name, sub: formatBytes(asset.size_bytes), asset });
    });
    funscripts.forEach((asset) => {
      items.push({ key: asset.id, type: "funscript", label: asset.file_name, sub: formatBytes(asset.size_bytes), asset });
    });
    return items;
  }, [videos, images, pdfs, funscripts]);

  async function handleDownload(asset: MediaAsset) {
    setDownloadingId(asset.id);
    try {
      await downloadAsset(asset);
      toast("Download started.", "success");
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Download failed.", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  if (!set) return null;

  const poster = thumbnailUrl(set.thumbnail_path);
  const activeType = activeAsset?.type ?? set.primary_type;
  const activeUrl = activeAsset ? urls[activeAsset.id] : undefined;
  const stageLoading = loading || urlsLoading;
  const imageIndex = activeAsset ? images.findIndex((image) => image.id === activeAsset.id) : -1;

  return (
    <div className="modal-backdrop player-backdrop" onMouseDown={onClose}>
      <div
        className="player-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="player-head">
          <div className="player-head-art">
            <img src={poster} alt="" />
          </div>
          <div className="player-head-copy">
            <p className="eyebrow">Now viewing</p>
            <h2 id="player-title">{set.title}</h2>
            <div className="player-head-meta">
              <span>{set.asset_count} {set.asset_count === 1 ? "file" : "files"}</span>
              <span className="meta-dot" />
              <span>2K</span>
              <span className="meta-dot" />
              <span>{typeLabels[activeType]}</span>
              {profile && (
                <span className="player-verified">{accessLabel(set.access_level)}</span>
              )}
            </div>
          </div>
          <div className="player-head-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm player-download"
              disabled={!activeAsset || downloadingId === activeAsset?.id}
              onClick={() => activeAsset && void handleDownload(activeAsset)}
              aria-label="Download this file"
            >
              {activeAsset && downloadingId === activeAsset.id ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Download size={15} />
              )}
              <span>Download</span>
            </button>
            <button type="button" className="modal-close player-close" aria-label="Close player" onClick={onClose}>
              <X size={19} />
            </button>
          </div>
        </header>

        <div className={`player-body player-body--${activeType}`}>
          <div className="player-stage">
            {stageLoading && (
              <div className="player-stage-loading">
                <Loader2 size={30} className="spin" />
                <p>Unlocking secure stream…</p>
              </div>
            )}

            {!stageLoading && error && (
              <div className="player-stage-error">
                <AlertTriangle size={30} />
                <h3>We couldn&apos;t load this set.</h3>
                <p>{error}</p>
                {set.access_level === "full" && accessLevel === "basic" ? (
                  <a className="btn btn--primary btn--sm" href="/#pricing">
                    Upgrade to Full Access — {FULL_PRICE_LABEL}
                  </a>
                ) : (
                  <a className="btn btn--primary btn--sm" href="/account">
                    Check membership status
                  </a>
                )}
              </div>
            )}

            {!stageLoading && !error && !assets.length && (
              <div className="player-stage-error">
                <FileText size={30} />
                <h3>No files yet.</h3>
                <p>This set has no uploaded assets. Check back soon.</p>
              </div>
            )}

            {!stageLoading && !error && activeAsset && activeType === "video" && activeUrl && (
              <VideoPlayer
                key={activeAsset.id}
                src={activeUrl}
                poster={poster}
                title={set.title}
                demo={DEMO_MODE || demoMode}
              />
            )}

            {!stageLoading && !error && activeAsset && activeType === "image" && (
              <ImageGallery
                images={images}
                urls={urls}
                activeId={activeAsset.id}
                onChange={setActiveId}
                onDownload={handleDownload}
                downloadingId={downloadingId}
              />
            )}

            {!stageLoading && !error && activeAsset && activeType === "pdf" && activeUrl && (
              <div className="pdf-viewer">
                <div className="pdf-toolbar">
                  <span><FileText size={15} /> {activeAsset.file_name}</span>
                  <div>
                    <a href={activeUrl} target="_blank" rel="noreferrer noopener" className="pdf-tool">
                      <ExternalLink size={14} /> Open
                    </a>
                    <button type="button" className="pdf-tool" onClick={() => void handleDownload(activeAsset)}>
                      <Download size={14} /> Save
                    </button>
                  </div>
                </div>
                <iframe src={`${activeUrl}#toolbar=0&navpanes=0&view=FitH`} title={activeAsset.file_name} />
              </div>
            )}

            {!stageLoading && !error && activeAsset && activeType === "funscript" && (
              <div className="funscript-stage">
                <div className="funscript-wave" aria-hidden="true">
                  {Array.from({ length: 48 }).map((_, index) => (
                    <span
                      key={index}
                      style={{ height: `${18 + Math.abs(Math.sin(index * 0.7)) * 78}%` }}
                    />
                  ))}
                </div>
                <span className="funscript-icon"><Flame size={26} /></span>
                <h3>Interactive funscript</h3>
                <p>
                  Sync this file with your favourite player — Handy, OSR2, ScriptPlayer and
                  most interactive devices are supported.
                </p>
                <p className="funscript-file">
                  {activeAsset.file_name} {activeAsset.size_bytes ? `· ${formatBytes(activeAsset.size_bytes)}` : ""}
                </p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void handleDownload(activeAsset)}
                  disabled={downloadingId === activeAsset.id}
                >
                  {downloadingId === activeAsset.id ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                  Download funscript
                </button>
              </div>
            )}
          </div>

          <aside className="player-side">
            <div className="player-side-head">
              <span>In this set</span>
              <span>{assets.length} files</span>
            </div>
            <div className="player-side-list">
              {sideItems.map((item) => {
                const Icon = typeIcons[item.type];
                const active =
                  item.type === "image"
                    ? imageIndex >= 0
                    : activeAsset?.id === item.asset.id;
                return (
                  <div key={item.key} className={`player-side-item${active ? " is-active" : ""}`}>
                    <button
                      type="button"
                      className="player-side-main"
                      onClick={() => {
                        setActiveId(item.asset.id);
                        if (item.type === "image" && item.count && imageIndex < 0) {
                          setActiveId(images[0]?.id ?? item.asset.id);
                        }
                      }}
                    >
                      <span className={`player-side-icon player-side-icon--${item.type}`}>
                        <Icon size={15} />
                      </span>
                      <span className="player-side-copy">
                        <span className="player-side-label">{item.label}</span>
                        <span className="player-side-sub">{item.sub || typeLabels[item.type]}</span>
                      </span>
                    </button>
                    {item.type !== "image" && (
                      <button
                        type="button"
                        className="player-side-dl"
                        aria-label={`Download ${item.label}`}
                        onClick={() => void handleDownload(item.asset)}
                      >
                        {downloadingId === item.asset.id ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="player-side-footer">
              <div className="player-side-secure">
                <ShieldCheck size={14} />
                <span>Signed URL · expires in minutes</span>
              </div>
              <p>Files are watermarked for your account. Please don&apos;t share them.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
