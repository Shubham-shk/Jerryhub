import { useState, type CSSProperties, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  Eye,
  FileText,
  Flame,
  Gamepad2,
  Image as ImageIcon,
  Info,
  Layers,
  Play,
} from "lucide-react";
import { formatDuration, thumbnailUrl } from "../lib/api";
import { accessLabel } from "../lib/access";
import type { MediaCategory, MediaSet, MediaType } from "../lib/types";
import { useReveal } from "../hooks/useReveal";

const typeLabels: Record<MediaType, string> = {
  video: "Video",
  image: "Art Gallery",
  pdf: "Manga / Comic",
  funscript: "Funscript",
};

const categoryLabels: Record<MediaCategory, string> = {
  animation: "Animation",
  arts: "NSFW Arts",
  games: "2D Game",
  comics: "Manga",
};

const categoryKanji: Record<MediaCategory, string> = {
  animation: "映像",
  arts: "画集",
  games: "遊戯",
  comics: "漫画",
};

const categoryColorGlow: Record<MediaCategory, string> = {
  animation: "rgba(255, 45, 120, 0.55)",
  arts: "rgba(244, 63, 94, 0.55)",
  games: "rgba(34, 211, 238, 0.55)",
  comics: "rgba(168, 85, 247, 0.55)",
};

interface MediaCardProps {
  set: MediaSet;
  locked: boolean;
  onOpen: (set: MediaSet) => void;
  onLocked: (set: MediaSet) => void;
  variant?: "carousel" | "grid" | "featured";
  index?: number;
  aspectRatio?: "a4" | "16:9";
  showRank?: boolean;
  comingSoon?: boolean;
}

export function MediaCard({
  set,
  locked,
  onOpen,
  onLocked,
  variant = "grid",
  index,
  aspectRatio,
  showRank = false,
  comingSoon = false,
}: MediaCardProps) {
  const { ref, revealed } = useReveal<HTMLElement>();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const duration = formatDuration(set.duration_seconds);
  const categoryLabel = categoryLabels[set.category] ?? typeLabels[set.primary_type];
  const kanji = categoryKanji[set.category] ?? "特選";
  const delay = index ? Math.min(index - 1, 7) * 45 : 0;
  const ratio = aspectRatio ?? "a4";

  const glowColor = categoryColorGlow[set.category] ?? "rgba(255, 45, 120, 0.5)";

  function activate(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (locked) onLocked(set);
    else onOpen(set);
  }

  function handleDetailsClick(e: MouseEvent) {
    e.stopPropagation();
    navigate(`/content/${set.slug}`);
  }

  return (
    <article
      ref={ref}
      className={`poster-card poster-card--${variant} poster-card--cat-${set.category}${revealed ? " is-revealed" : ""}`}
      style={{
        "--reveal-delay": `${delay}ms`,
        "--poster-glow": glowColor,
      } as CSSProperties}
      data-ratio={ratio}
      role="button"
      tabIndex={0}
      aria-label={`${set.title} — ${categoryLabel}${comingSoon ? " (coming soon)" : ""}`}
      onClick={() => activate()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      <div className="poster-art">
        {/* Main Artwork Container with category-tailored aspect ratio */}
        <div className="poster-frame" data-ratio={ratio}>
          <img
            className="poster-img"
            src={thumbnailUrl(set.thumbnail_path)}
            alt={set.title}
            loading="lazy"
          />

          {/* Diagonal Slice Overlay Accent (Inspired by reference aesthetic) */}
          <div className="poster-diagonal-cut" aria-hidden="true" />

          {/* Deep Vignette & Dark Edge Gradient */}
          <div className="poster-shade" aria-hidden="true" />
          <div className="poster-edge-highlight" aria-hidden="true" />

          {comingSoon && (
            <div className="poster-coming-soon" aria-hidden="true">
              <span className="poster-coming-soon-badge">
                <Clock3 size={12} /> Coming Soon
              </span>
            </div>
          )}

          {/* Top Badges (New, Trending, Category Kanji) */}
          <div className="poster-badges">
            <span className="poster-kanji-pill" title={categoryLabel}>
              {kanji}
            </span>

            {set.is_new && <span className="badge badge--new">NEW DROP</span>}
            {set.is_trending && (
              <span className="badge badge--trending">
                <Flame size={10} /> HOT
              </span>
            )}
            {set.version && (
              <span className="badge badge--version">{set.version}</span>
            )}
            {set.chapter_info && (
              <span className="badge badge--chapter">{set.chapter_info}</span>
            )}
            {set.access_level && set.access_level !== "public" && (
              <span className={`badge badge--access badge--access-${set.access_level}`}>
                {accessLabel(set.access_level)}
              </span>
            )}
          </div>

          {/* Top Right Quick Action Icon */}
          <button
            type="button"
            className="poster-quick-action"
            onClick={handleDetailsClick}
            aria-label={`View details for ${set.title}`}
            title="View Details"
          >
            <ArrowUpRight size={14} />
          </button>

          {/* Primary Poster Information Overlay (Anchored Directly Over Lower Artwork) */}
          <div className="poster-artwork-info">
            <div className="poster-eyebrow-row">
              <span className="poster-cat-tag">
                {set.category === "games" && <Gamepad2 size={11} />}
                {set.category === "comics" && <BookOpen size={11} />}
                {set.category === "animation" && <Play size={11} />}
                {set.category === "arts" && <ImageIcon size={11} />}
                <span>{categoryLabel}</span>
              </span>

              {set.genre && <span className="poster-genre-tag">{set.genre}</span>}
            </div>

            <h3 className={`poster-title${set.title.length > 24 ? " poster-title--long" : ""}`} title={set.title}>
              {set.title}
            </h3>

            <div className="poster-meta-row">
              {duration ? (
                <span className="poster-meta-item">
                  <Clock3 size={11} /> {duration}
                </span>
              ) : set.chapter_info ? (
                <span className="poster-meta-item">
                  <FileText size={11} /> {set.chapter_info}
                </span>
              ) : (
                <span className="poster-meta-item">
                  <Layers size={11} /> {set.asset_count} {set.asset_count === 1 ? "file" : "files"}
                </span>
              )}

              <span className="meta-dot" aria-hidden="true" />
              <span className="poster-meta-tag">2K ULTRA</span>

              {set.views && (
                <>
                  <span className="meta-dot" aria-hidden="true" />
                  <span className="poster-views-tag">
                    <Eye size={10} /> {(set.views / 1000).toFixed(0)}k
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Smooth Interactive Hover Reveal Sheet */}
          <div className={`poster-hover-sheet${hovered ? " is-hovered" : ""}`}>
            <div className="poster-hover-header">
              <span className="poster-hover-category">{categoryLabel}</span>
              {set.author && <span className="poster-hover-author">{set.author}</span>}
            </div>

            <p className="poster-hover-desc">
              {set.description || "Exclusive full-length release available in the private vault."}
            </p>

            <div className="poster-hover-actions">
              <button
                type="button"
                className="btn btn--primary btn--sm poster-hover-play-btn"
                onClick={(e) => activate(e)}
              >
                {set.category === "games" ? (
                  <>
                    <Gamepad2 size={14} />
                    <span>Play Now</span>
                  </>
                ) : set.category === "comics" ? (
                  <>
                    <BookOpen size={14} />
                    <span>Read Now</span>
                  </>
                ) : set.primary_type === "image" ? (
                  <>
                    <ImageIcon size={14} />
                    <span>Gallery</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    <span>Watch Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn--ghost btn--sm poster-hover-details-btn"
                onClick={handleDetailsClick}
                aria-label="View details"
                title="View Release Details"
              >
                <Info size={14} />
                <span>Details</span>
              </button>
            </div>
          </div>
        </div>

        {/* Large Cinematic Rank Number for Trending / Featured Lists */}
        {(showRank || (variant === "carousel" && index !== undefined)) && index !== undefined && (
          <span className="poster-number" aria-hidden="true">
            {String(index).padStart(2, "0")}
          </span>
        )}
      </div>
    </article>
  );
}
