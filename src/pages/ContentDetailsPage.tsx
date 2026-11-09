import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Eye,
  FileText,
  Flame,
  Gamepad2,
  Image as ImageIcon,
  Layers,
  Play,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Carousel } from "../components/Carousel";
import { MediaCard } from "../components/MediaCard";
import { formatDuration, thumbnailUrl } from "../lib/api";
import { accessLabel } from "../lib/access";
import type { MediaCategory } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMediaSets } from "../hooks/useMediaSets";
import { useOpenMedia } from "../hooks/useOpenMedia";
import { FULL_PRICE_LABEL, PATREON_PAGE_URL, UPGRADE_CTA_LABEL } from "../lib/config";

const categoryLabels: Record<MediaCategory, string> = {
  animation: "2K Animation",
  arts: "NSFW Arts & Video",
  games: "2D Game / VN",
  comics: "Manga & Comics",
};

const categoryKanji: Record<MediaCategory, string> = {
  animation: "公式映像",
  arts: "特選画集",
  games: "電脳遊戯",
  comics: "連載漫画",
};

export function ContentDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { accessLevel, isPatron, isBasic, canAccess, profile } = useAuth();
  const { openAuthModal, toast } = useUI();
  const { sets, loading } = useMediaSets();
  const { open, player } = useOpenMedia();

  const set = useMemo(() => {
    return sets.find((s) => s.slug === slug) ?? sets.find((s) => s.id === slug) ?? null;
  }, [sets, slug]);

  const pageTitle = set ? `${set.title} — Uncensored 2K Release` : "Release Details";
  useDocumentTitle(pageTitle);

  // Related sets (from same category, excluding active set)
  const relatedSets = useMemo(() => {
    if (!set) return [];
    return sets.filter((s) => s.id !== set.id && s.category === set.category).slice(0, 8);
  }, [sets, set]);

  if (loading && !set) {
    return (
      <div className="details-loading-state">
        <Sparkles size={32} className="spin" />
        <p>Loading release vault...</p>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="container details-not-found">
        <h2>Release Not Found</h2>
        <p>The requested media release may have been moved or archived.</p>
        <Link to="/browse" className="btn btn--primary">
          <ArrowLeft size={16} /> Back to Library
        </Link>
      </div>
    );
  }

  const poster = thumbnailUrl(set.thumbnail_path);
  const duration = formatDuration(set.duration_seconds);
  const categoryLabel = categoryLabels[set.category] ?? "Release";
  const kanji = categoryKanji[set.category] ?? "公式配信";
  const releaseDate = new Date(set.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const CategoryIcon =
    set.category === "games"
      ? Gamepad2
      : set.category === "comics"
      ? BookOpen
      : set.category === "arts"
      ? ImageIcon
      : Play;

  function handleAction() {
    if (!set) return;
    if (canAccess(set.access_level)) {
      open(set);
      return;
    }
    sessionStorage.setItem("lhh_post_login_path", `/content/${set.slug}`);
    if (!profile) {
      openAuthModal("locked");
      return;
    }
    openAuthModal(isBasic && set.access_level === "full" ? "upgrade" : "inactive");
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast("Release link copied to clipboard.", "success");
    }
  }

  return (
    <div className="details-page">
      {/* Enlarged heavily blurred background canvas creating deep atmospheric immersion */}
      <div className="details-backdrop-layer" aria-hidden="true">
        <img src={poster} alt="" className="details-backdrop-img" />
        <div className="details-backdrop-vignette" />
        <div className="details-backdrop-grid" />
      </div>

      <div className="container details-container">
        {/* Back Navigation Breadcrumb */}
        <div className="details-breadcrumb">
          <button type="button" onClick={() => navigate(-1)} className="details-back-link">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <span className="details-bread-dot">/</span>
          <Link to={`/browse?category=${set.category}`}>{categoryLabel}</Link>
          <span className="details-bread-dot">/</span>
          <span className="details-bread-current">{set.title}</span>
        </div>

        {/* Main Cinematic Showcase Hero */}
        <div className="details-hero-layout">
          {/* Left Column: Crisp Primary Poster with Multi-panel Framing Accent */}
          <div className="details-poster-wrap">
            <div className="details-poster-frame" data-ratio={set.aspect_ratio || "2:3"}>
              <img src={poster} alt={set.title} className="details-poster-image" />
              <div className="details-poster-diagonal-shimmer" />

              {/* Japanese Seal & 18+ Rating Badge */}
              <div className="details-poster-top-bar">
                <span className="details-kanji-seal">{kanji}</span>
                <span className="details-rating-badge">18+ UNCENSORED</span>
              </div>

              {/* Quick Play Floating Trigger */}
              <button
                type="button"
                className="details-poster-play-trigger"
                onClick={handleAction}
                aria-label="Launch player"
              >
                <Play size={26} fill="currentColor" />
              </button>
            </div>

            {/* Poster Quick Info Strip */}
            <div className="details-poster-stats-strip">
              <span className="details-stat-pill">
                <Layers size={13} /> {set.asset_count} Files
              </span>
              <span className="details-stat-pill">2K Quality</span>
              {set.views && (
                <span className="details-stat-pill">
                  <Eye size={13} /> {(set.views / 1000).toFixed(0)}k Views
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Rich Glassmorphic Information Panel */}
          <div className="details-info-panel">
            {/* Category & Status Header */}
            <div className="details-header-row">
              <span className="details-category-pill">
                <CategoryIcon size={14} />
                <span>{categoryLabel}</span>
              </span>

              {set.is_new && <span className="badge badge--new">NEW DROP</span>}
              {set.is_trending && (
                <span className="badge badge--trending">
                  <Flame size={12} /> TRENDING #1
                </span>
              )}
              {set.version && <span className="badge badge--version">{set.version}</span>}
              {set.access_level && set.access_level !== "public" && (
                <span className={`badge badge--access badge--access-${set.access_level}`}>
                  {accessLabel(set.access_level)}
                </span>
              )}
            </div>

            {/* Release Title */}
            <h1 className="details-title">{set.title}</h1>

            {/* Author / Studio Subtitle */}
            <div className="details-creator-row">
              <span>Produced by <strong>{set.author || "Jerryhub Studio"}</strong></span>
              <span className="details-meta-separator">·</span>
              <span className="details-release-date">
                <Calendar size={13} /> {releaseDate}
              </span>
            </div>

            {/* Story Description & Synopsis */}
            <div className="details-synopsis-card">
              <h3>Release Synopsis</h3>
              <p>{set.description || "Full uncensored release archived exclusively for active members."}</p>
            </div>

            {/* Technical Specifications Grid */}
            <div className="details-specs-grid">
              <div className="details-spec-item">
                <span className="spec-label">Format</span>
                <span className="spec-value">
                  {set.category === "games"
                    ? "Interactive Web / 2D Game"
                    : set.category === "comics"
                    ? "Digital Manga / PDF"
                    : set.primary_type === "image"
                    ? "High-DPI Gallery"
                    : "MP4 Video + Funscript"}
                </span>
              </div>

              <div className="details-spec-item">
                <span className="spec-label">Length / Scope</span>
                <span className="spec-value">
                  {duration || set.chapter_info || `${set.asset_count} Full-Res Assets`}
                </span>
              </div>

              <div className="details-spec-item">
                <span className="spec-label">Resolution</span>
                <span className="spec-value">2560 × 1440 (2K Master)</span>
              </div>

              <div className="details-spec-item">
                <span className="spec-label">Access Level</span>
                <span className="spec-value">{accessLabel(set.access_level)}</span>
              </div>
            </div>

            {/* Tags Pills */}
            <div className="details-tags-wrap">
              <span className="tags-label">Tags:</span>
              <div className="details-tags-list">
                {(set.tags || ["2KAnimation", "Exclusive", "Uncensored", "Vault"]).map((tag) => (
                  <Link key={tag} to={`/browse?q=${tag}`} className="details-tag-pill">
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons Bar */}
            <div className="details-actions-bar">
              {isBasic && set.access_level === "full" ? (
                <a
                  className="btn btn--primary btn--xl details-main-cta"
                  href={PATREON_PAGE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Sparkles size={20} />
                  <span>{UPGRADE_CTA_LABEL}</span>
                  <ArrowRight size={18} />
                </a>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary btn--xl details-main-cta"
                  onClick={handleAction}
                >
                  {set.category === "games" ? (
                    <>
                      <Gamepad2 size={20} />
                      <span>Launch Game Online</span>
                    </>
                  ) : set.category === "comics" ? (
                    <>
                      <BookOpen size={20} />
                      <span>Open Manga Reader</span>
                    </>
                  ) : set.primary_type === "image" ? (
                    <>
                      <ImageIcon size={20} />
                      <span>Open Full Gallery</span>
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" />
                      <span>Watch Now in 2K</span>
                    </>
                  )}
                  <ArrowRight size={18} />
                </button>
              )}

              <button
                type="button"
                className="btn btn--ghost btn--xl details-share-btn"
                onClick={handleShare}
                title="Share Release"
              >
                <Share2 size={18} />
                <span>Share</span>
              </button>
            </div>

            {/* Member Security Guarantee Note */}
            <div className="details-guarantee-note">
              <ShieldCheck size={16} />
              <span>
                {canAccess(set.access_level)
                  ? `Included with your membership · ${accessLabel(accessLevel)} verified.`
                  : isPatron
                    ? `This release is included with ${accessLabel(set.access_level)}.`
                    : `This release is available with ${accessLabel(set.access_level)}. Memberships start from $5.`}
              </span>
            </div>

            {isBasic && set.access_level === "full" && (
              <p className="details-upgrade-note">
                Full Access is {FULL_PRICE_LABEL} and includes every Basic Access benefit plus all
                available premium content.
              </p>
            )}
          </div>
        </div>

        {/* Additional Assets & Gallery Preview Section */}
        {set.demo_assets && set.demo_assets.length > 0 && (
          <section className="details-files-section">
            <div className="details-section-heading">
              <div>
                <p className="eyebrow">Contents &amp; Files</p>
                <h2>Included in this Release</h2>
              </div>
              <span className="details-files-count">
                {set.demo_assets.length} {set.demo_assets.length === 1 ? "file" : "files"} included
              </span>
            </div>

            <div className="details-files-grid">
              {set.demo_assets.map((asset) => (
                <div key={asset.id} className="details-file-card" onClick={handleAction} role="button" tabIndex={0}>
                  <div className="file-card-icon">
                    {asset.type === "video" ? (
                      <Play size={18} />
                    ) : asset.type === "pdf" ? (
                      <FileText size={18} />
                    ) : asset.type === "funscript" ? (
                      <Flame size={18} />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                  </div>
                  <div className="file-card-info">
                    <span className="file-name">{asset.file_name}</span>
                    <span className="file-meta">
                      {asset.type.toUpperCase()} · 2K Master
                    </span>
                  </div>
                  <button type="button" className="file-card-action" aria-label="Open file">
                    <ArrowRight size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* "More Like This" Related Content Carousel */}
        {relatedSets.length > 0 && (
          <section className="details-related-section">
            <div className="details-section-heading">
              <div>
                <p className="eyebrow">Discover More</p>
                <h2>Related Releases</h2>
              </div>
              <Link to={`/browse?category=${set.category}`} className="link-arrow">
                <span>View all in {categoryLabel}</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <Carousel label="Related Releases">
              {relatedSets.map((item, index) => (
                <MediaCard
                  key={item.id}
                  set={item}
                  locked={!canAccess(item.access_level)}
                  onOpen={open}
                  onLocked={open}
                  variant="carousel"
                  index={index + 1}
                />
              ))}
            </Carousel>
          </section>
        )}
      </div>

      {player}
    </div>
  );
}
