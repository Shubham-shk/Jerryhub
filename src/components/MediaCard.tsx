import { useState, type CSSProperties, type MouseEvent } from "react";
import { BookOpen, Gamepad2, Image as ImageIcon, Lock, Play } from "lucide-react";
import { thumbnailUrl } from "../lib/api";
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
  arts: "Exclusive Arts",
  games: "2D Game",
  comics: "Manga",
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
}: MediaCardProps) {
  const { ref, revealed } = useReveal<HTMLElement>();
  const [, setHovered] = useState(false);

  const categoryLabel = categoryLabels[set.category] ?? typeLabels[set.primary_type];
  const delay = index ? Math.min(index - 1, 7) * 45 : 0;
  const ratio = aspectRatio ?? "a4";

  const glowColor = categoryColorGlow[set.category] ?? "rgba(255, 45, 120, 0.5)";

  const actionLabel =
    set.category === "comics"
      ? "Read now"
      : set.category === "games"
        ? "Play now"
        : set.category === "arts"
          ? "View gallery"
          : "Watch now";
  const ActionIcon =
    set.category === "comics"
      ? BookOpen
      : set.category === "games"
        ? Gamepad2
        : set.category === "arts"
          ? ImageIcon
          : Play;

  function activate(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (locked) onLocked(set);
    else onOpen(set);
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
      aria-label={`${set.title} — ${categoryLabel}`}
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
        {/* Main Artwork Container with category-tailored aspect ratio - NO TEXT OVERLAYS */}
        <div className="poster-frame" data-ratio={ratio}>
          <img
            className="poster-img"
            src={thumbnailUrl(set.thumbnail_path)}
            alt={set.title}
            loading="lazy"
          />

          {/* Diagonal Slice Overlay Accent */}
          <div className="poster-diagonal-cut" aria-hidden="true" />

          {/* Subtle Vignette & Dark Edge Gradient */}
          <div className="poster-shade" aria-hidden="true" />
          <div className="poster-edge-highlight" aria-hidden="true" />

          {/* Membership badge — every poster states its access level */}
          <div className="poster-badges">
            <span
              className={`badge ${
                set.access_level === "full" ? "badge--access-full" : "badge--access-basic"
              }`}
            >
              {locked ? <Lock size={10} /> : null}
              {set.access_level === "full" ? "Full Access" : "Basic Access"}
            </span>
          </div>

          {/* Hover action only — no titles or descriptions over the artwork */}
          <div className="poster-hover-sheet">
            <div className="poster-hover-actions">
              <span className="btn btn--primary btn--sm poster-hover-play-btn">
                {locked ? <Lock size={13} /> : <ActionIcon size={13} />}
                <span>{locked ? "Unlock with Patreon" : actionLabel}</span>
              </span>
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
