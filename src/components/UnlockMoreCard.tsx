import { type CSSProperties, type MouseEvent } from "react";
import { ArrowRight, Lock, Sparkles, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BASIC_PRICE_LABEL } from "../lib/config";
import { useReveal } from "../hooks/useReveal";
import { POSTER_IMAGES } from "../data/posters";

interface UnlockMoreCardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  category?: "trending" | "newest" | "arts" | "games" | "comics" | "all";
  count?: string;
  aspectRatio?: "a4" | "16:9" | "3:4" | "1:1.45";
  variant?: "carousel" | "grid";
  index?: number;
}

const categoryArtworks: Record<string, string> = {
  trending: POSTER_IMAGES[3],
  newest: POSTER_IMAGES[4],
  arts: POSTER_IMAGES[2],
  games: POSTER_IMAGES[12],
  comics: POSTER_IMAGES[5],
  all: POSTER_IMAGES[6],
};

export function UnlockMoreCard({
  title,
  subtitle,
  badge = "VIP VAULT",
  category = "all",
  count = "+500",
  aspectRatio = "a4",
  variant = "carousel",
  index = 8,
}: UnlockMoreCardProps) {
  const { isPatron } = useAuth();
  const navigate = useNavigate();
  const { ref, revealed } = useReveal<HTMLElement>();

  const bgImg = categoryArtworks[category] || POSTER_IMAGES[0];

  const defaultTitles: Record<string, { title: string; sub: string }> = {
    trending: {
      title: "Unlock 500+ More Trending",
      sub: "Uncensored 2K animation, games & high-res art",
    },
    newest: {
      title: "Explore 1,200+ Vault Archives",
      sub: "Daily uncensored drops added to private library",
    },
    arts: {
      title: "Unlock 10,000+ Exclusive Artworks",
      sub: "Full 4K galleries, videos & sensual motion",
    },
    games: {
      title: "Unlock 40+ Playable 2D Games",
      sub: "Visual novels, RPG routes & complete gallery scenes",
    },
    comics: {
      title: "Unlock 350+ Manga Chapters",
      sub: "Unrated serialized chapters in reading room",
    },
    all: {
      title: "Unlock Full Private Vault",
      sub: `From only ${BASIC_PRICE_LABEL}/mo · Instant Patreon access`,
    },
  };

  const cardTitle = title || defaultTitles[category]?.title || "Unlock Full Library";
  const cardSub = subtitle || defaultTitles[category]?.sub || `Starts at ${BASIC_PRICE_LABEL}/mo · Cancel anytime`;

  function handleClick(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isPatron) {
      navigate(category === "all" ? "/browse" : `/newest?category=${category}`);
      return;
    }
    const pricingEl = document.getElementById("pricing");
    if (pricingEl) {
      pricingEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate("/#pricing");
    }
  }

  return (
    <article
      ref={ref}
      className={`poster-card poster-card--${variant} unlock-more-card${revealed ? " is-revealed" : ""}`}
      style={{
        "--reveal-delay": `${(index % 8) * 45}ms`,
        "--poster-glow": "rgba(255, 45, 120, 0.75)",
      } as CSSProperties}
      data-ratio={aspectRatio}
      role="button"
      tabIndex={0}
      aria-label={`${cardTitle} — Patreon Membership Required`}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="poster-art">
        <div className="poster-frame unlock-frame" data-ratio={aspectRatio}>
          {/* Teaser blurred background image */}
          <img
            className="poster-img unlock-bg-img"
            src={bgImg}
            alt=""
            loading="lazy"
            aria-hidden="true"
          />

          {/* Frosted dark luxury overlay */}
          <div className="unlock-overlay" aria-hidden="true" />
          <div className="unlock-glow-orb" aria-hidden="true" />
          <div className="poster-edge-highlight" aria-hidden="true" />

          {/* Top badges */}
          <div className="poster-badges">
            <span className="badge badge--unlock-vip">
              <Sparkles size={11} /> {badge}
            </span>
            <span className="badge badge--access-full">
              <ShieldCheck size={11} /> 18+ Unrated
            </span>
          </div>

          {/* Center Vault Lock & Counter */}
          <div className="unlock-center-content">
            <div className="unlock-lock-icon-wrap">
              <div className="unlock-lock-pulse" />
              <Lock size={22} className="unlock-lock-svg" />
            </div>

            <div className="unlock-count-badge">
              <span className="unlock-count-number">{count}</span>
              <span className="unlock-count-label">MORE WAITING</span>
            </div>

            <h3 className="unlock-title">{cardTitle}</h3>
            <p className="unlock-subtitle">{cardSub}</p>

            <div className="unlock-btn-wrap">
              <span className="btn btn--primary btn--sm unlock-cta-btn">
                <Sparkles size={14} />
                <span>Unlock Now</span>
                <ArrowRight size={14} />
              </span>
            </div>

            <span className="unlock-micro-note">
              From {BASIC_PRICE_LABEL}/mo · Patreon instant unlock
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
