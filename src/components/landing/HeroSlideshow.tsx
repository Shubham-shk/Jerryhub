import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Image as ImageIcon,
  Info,
  Play,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { BASIC_PRICE_LABEL } from "../../lib/config";
import { PosterMarquee } from "./PosterMarquee";
import { POSTER_IMAGES, UNIVERSAL_SET_TAGS } from "../../data/posters";

export interface HeroSlide {
  id: string;
  slug: string;
  eyebrow: string;
  kanji: string;
  title: string;
  accentTitle: string;
  category: "animation" | "games" | "comics" | "arts";
  categoryLabel: string;
  description: string;
  meta: string;
  rating: string;
  portraitPoster: string;
  glowColor: string;
  tags: string[];
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "got-pregnant-full-set",
    slug: "got-pregnant-full-set",
    eyebrow: "Featured Tonight · 2K Master",
    kanji: "秘密",
    title: "GOT PREGNANT",
    accentTitle: "FULL SET.",
    category: "animation",
    categoryLabel: "2K Animation",
    description:
      "A slow-burn story with polished 2K art, deliberate pacing and a synchronized audio experience.",
    meta: "24 min · 2K Ultra · Interactive",
    rating: "18+ Exclusive",
    portraitPoster: POSTER_IMAGES[0],
    glowColor: "rgba(255, 45, 120, 0.42)",
    tags: ["2KAnimation", "Interactive", "Drama"],
  },
  {
    id: "professor-secret-of-account",
    slug: "professor-secret-of-account",
    eyebrow: "New Drama · 2K Master",
    kanji: "秘密の口座",
    title: "PROFESSOR SECRET",
    accentTitle: "OF ACCOUNT.",
    category: "animation",
    categoryLabel: "2K Feature",
    description:
      "A professor with a secret second life, a private account and one student who finds it. Polished 2K art with an immersive edit.",
    meta: "21 min · 2K Ultra · Story",
    rating: "18+ Exclusive",
    portraitPoster: POSTER_IMAGES[1],
    glowColor: "rgba(168, 85, 247, 0.42)",
    tags: ["FamilyDrama", "2KAnimation", "Story"],
  },
  {
    id: "tomboy-friends-night-visit",
    slug: "tomboy-friends-night-visit",
    eyebrow: "Playable Visual Novel · Special Edition",
    kanji: "特別版",
    title: "TOMBOY FRIEND'S",
    accentTitle: "NIGHT VISIT.",
    category: "games",
    categoryLabel: "Visual Novel",
    description:
      "A special-edition visual novel where every route opens a new scene. Multiple endings, one very long night.",
    meta: "2D Game · 4 Routes · Special Edition",
    rating: "18+ Explicit",
    portraitPoster: POSTER_IMAGES[10],
    glowColor: "rgba(6, 182, 212, 0.42)",
    tags: ["VisualNovel", "MultipleEndings", "Playable"],
  },
  {
    id: "bullys-nnn-challenge",
    slug: "bullys-nnn-challenge",
    eyebrow: "From The Reading Room · Complete",
    kanji: "挑戦",
    title: "BULLY'S NNN",
    accentTitle: "CHALLENGE.",
    category: "comics",
    categoryLabel: "Manga & Comic",
    description:
      "A campus rivalry story with confident characters, crisp panel work and a complete full-color chapter.",
    meta: "3 Chapters · Illustrated · PDF Reader",
    rating: "18+ Exclusive",
    portraitPoster: POSTER_IMAGES[5],
    glowColor: "rgba(139, 92, 246, 0.42)",
    tags: ["Manga", "Campus", "FullColor", "Complete"],
  },
  {
    id: "stepsis-thinks-she-is-chubby",
    slug: "stepsis-thinks-she-is-chubby",
    eyebrow: "Playable 2D Game · All Routes",
    kanji: "生意気な妹",
    title: "STEPSIS THINKS SHE",
    accentTitle: "IS CHUBBY.",
    category: "games",
    categoryLabel: "2D Game",
    description:
      "A playful story with expressive sprites, unlockable gallery scenes and multiple endings.",
    meta: "2D Game · Unlockables · v1.2",
    rating: "18+ Explicit",
    portraitPoster: POSTER_IMAGES[11],
    glowColor: "rgba(245, 158, 11, 0.4)",
    tags: ["2DGame", "StepSis", "Unlockables", "Playable"],
  },
  {
    id: "goth-friend-got-some-problems",
    slug: "goth-friend-got-some-problems",
    eyebrow: "Vault Gallery · High-DPI Stills",
    kanji: "黒髪",
    title: "GOTH FRIEND GOT",
    accentTitle: "SOME PROBLEMS.",
    category: "arts",
    categoryLabel: "Art Gallery",
    description:
      "A dark aesthetic gallery with moody cinematic grading, exclusive stills and a high-DPI art-book finish.",
    meta: "48 Stills · High-DPI · 4K",
    rating: "18+ Explicit",
    portraitPoster: POSTER_IMAGES[2],
    glowColor: "rgba(20, 184, 166, 0.4)",
    tags: ["Goth", "ArtGallery", "HighDPI", "Editorial"],
  },
];

/* One-line proof points shown on the right of the hero. */
export const HERO_STATS = [
  { lead: "10,000+", text: "NSFW sets" },
  { lead: "Fully", text: "uncensored" },
  { lead: "NSFW", text: "videos & animations" },
  { lead: "2D", text: "games" },
];
export function HeroSlideshow() {
  const { isPatron } = useAuth();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const slide = HERO_SLIDES[index];

  // Auto-rotation every 7.5 seconds when not hovered
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, 7500);
    return () => window.clearInterval(timer);
  }, [paused, index]);

  function go(next: number) {
    setIndex((next + HERO_SLIDES.length) % HERO_SLIDES.length);
  }

  async function handlePrimaryAction() {
    if (isPatron) {
      navigate(`/content/${slide.slug}`);
      return;
    }
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const CategoryIcon =
    slide.category === "games"
      ? Gamepad2
      : slide.category === "comics"
      ? BookOpen
      : slide.category === "arts"
      ? ImageIcon
      : Play;

  return (
    <section
      className="hero-showcase"
      aria-roledescription="carousel"
      aria-label="Featured Releases Slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event: TouchEvent) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event: TouchEvent) => {
        if (touchStart.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
        if (Math.abs(delta) > 50) {
          go(index + (delta > 0 ? -1 : 1));
        }
        touchStart.current = null;
      }}
    >
      {/* Full-bleed A4 poster wall drifting right-to-left behind the copy */}
      <PosterMarquee paused={paused} />

      {/* Dynamic Ambient Glow that synchronizes with the active slide palette */}
      <div
        className="hero-ambient-glow"
        style={{
          background: `radial-gradient(1000px 550px at 70% 30%, ${slide.glowColor}, transparent 65%)`,
        }}
        aria-hidden="true"
      />

      {/* Main Slideshow Stage */}
      <div className="hero-stage" data-paused={paused}>
        {/* Deep Left Gradient Scrim for crisp text legibility */}
        <div className="hero-veil" aria-hidden="true" />

        {/* Hero Content Area — balanced two-column composition */}
        <div className="container hero-content-wrap">
          <div className="hero-text-content">
            {/* Badges / Eyebrow Row */}
            <div className="hero-badge-row">
              <span className="hero-category-badge">
                <CategoryIcon size={12} />
                <span>{slide.categoryLabel}</span>
              </span>

              <span className="hero-kanji-tag">{slide.kanji}</span>
              <span className="hero-age-tag">{slide.rating}</span>
            </div>

            {/* Giant Bold Headline */}
            <h1 className="hero-headline">
              <span className="hero-headline-main">{slide.title}</span>{" "}
              <span className="hero-headline-accent">{slide.accentTitle}</span>
            </h1>

            {/* Synopsis Description with sharp contrast */}
            <p className="hero-synopsis">{slide.description}</p>

            {/* Meta Specs & Tags Row */}
            <div className="hero-specs-row">
              <div className="hero-spec-chip">
                <Sparkles size={13} />
                <span>{slide.meta}</span>
              </div>
              <span className="hero-spec-dot" />
              <div className="hero-tags-group">
                {UNIVERSAL_SET_TAGS.map((t) => (
                  <span key={t} className="hero-tag-pill">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Clean Action Buttons */}
            <div className="hero-buttons-row">
              <button
                type="button"
                className="btn btn--primary btn--xl hero-watch-cta"
                onClick={handlePrimaryAction}
              >
                {!isPatron ? (
                  <>
                    <Sparkles size={18} />
                    <span>Explore Memberships</span>
                  </>
                ) : slide.category === "games" ? (
                  <>
                    <Gamepad2 size={18} />
                    <span>Play Now</span>
                  </>
                ) : slide.category === "comics" ? (
                  <>
                    <BookOpen size={18} />
                    <span>Read Release</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span>Watch Now</span>
                  </>
                )}
                <ArrowRight size={16} />
              </button>

              <Link to={`/content/${slide.slug}`} className="btn btn--ghost btn--xl hero-details-cta">
                <Info size={16} />
                <span>View Details</span>
              </Link>
            </div>

            <p className="hero-membership-note">
              Premium entertainment starts at {BASIC_PRICE_LABEL}.{" "}
              <a href="#pricing">Explore memberships</a>
            </p>
          </div>

          {/* Library stat rail — proof points */}
          <aside className="hero-stat-rail" aria-label="Library at a glance">
            <p className="hero-stat-rail-title">Inside the vault</p>
            <ul className="hero-stat-list">
              {HERO_STATS.map((stat) => (
                <li className="hero-stat" key={stat.text}>
                  <span className="hero-stat-lead">{stat.lead}</span>
                  <span className="hero-stat-text">{stat.text}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Compact slide navigation, kept in the copy column */}
        <div className="container hero-slide-nav-wrap">
          <div className="hero-slide-nav">
            <button
              type="button"
              className="hero-nav-arrow"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
            >
              <ChevronLeft size={15} />
            </button>

            <div className="hero-slide-dots">
              {HERO_SLIDES.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  className={`hero-slide-dot${i === index ? " is-active" : ""}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}: ${item.title}`}
                >
                  <span className="hero-slide-dot-fill" />
                </button>
              ))}
            </div>

            <span className="hero-slide-count">
              0{index + 1} <em>/</em> 0{HERO_SLIDES.length}
            </span>

            <button
              type="button"
              className="hero-nav-arrow"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
