import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Compass,
  ExternalLink,
  Film,
  Flame,
  Gamepad2,
  Image as ImageIcon,
  Lock,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { MediaCard } from "../components/MediaCard";
import { UnlockMoreCard } from "../components/UnlockMoreCard";
import { MembershipBanner, ErrorBanner } from "../components/MembershipBanner";
import { RowSkeleton } from "../components/Skeletons";
import { PatreonMark } from "../components/PatreonMark";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMediaSets } from "../hooks/useMediaSets";
import { useOpenMedia } from "../hooks/useOpenMedia";
import { accessLabel } from "../lib/access";
import { BASIC_PRICE_LABEL, FULL_PRICE_LABEL, PATREON_PAGE_URL, UPGRADE_CTA_LABEL } from "../lib/config";
import { POSTER_IMAGES } from "../data/posters";

type CategoryFilter = "all" | "animation" | "video" | "arts" | "games" | "manga" | "comics";
type SortOption = "newest" | "trending" | "duration" | "title";

interface CategoryMetaItem {
  title: string;
  blurb: string;
  kanji: string;
  icon: typeof Flame;
  aspectRatio: "2:3" | "16:9" | "3:4" | "1:1.45";
}

const categoryInfo: Record<CategoryFilter, CategoryMetaItem> = {
  all: {
    title: "Complete Vault Archive",
    blurb: "Explore the entire catalog of uncensored 2K animation, 2D games, manga and high-res art galleries.",
    kanji: "全作品一覧",
    icon: Compass,
    aspectRatio: "2:3",
  },
  animation: {
    title: "2D Anime & CockHero",
    blurb: "Full-length animations, synchronized interactive edits, and remastered 2K 60FPS releases.",
    kanji: "新作アニメ",
    icon: Film,
    aspectRatio: "2:3",
  },
  video: {
    title: "Video Motion Releases",
    blurb: "High-bitrate cinematic video streams, short films, and alternate director cuts.",
    kanji: "映像作品",
    icon: Film,
    aspectRatio: "2:3",
  },
  arts: {
    title: "Exclusive Arts & Galleries",
    blurb: "Sensual editorial galleries, glitch loops, bioluminescent stills and 4K character portraits.",
    kanji: "官能画集",
    icon: ImageIcon,
    aspectRatio: "2:3",
  },
  games: {
    title: "2D Games & Visual Novels",
    blurb: "Playable choice-driven visual novels, fantasy RPG adventures, and neon arcade nights.",
    kanji: "電脳遊戯",
    icon: Gamepad2,
    aspectRatio: "3:4",
  },
  manga: {
    title: "Digital Manga",
    blurb: "Serialized romance, enemies-to-lovers arcs and gothic stories formatted for the digital reader.",
    kanji: "電子漫画",
    icon: BookOpen,
    aspectRatio: "1:1.45",
  },
  comics: {
    title: "Comics & Illustrated Stories",
    blurb: "Illustrated novellas, full-colour graphic novels and downloadable PDF story chapters.",
    kanji: "劇画物語",
    icon: BookOpen,
    aspectRatio: "1:1.45",
  },
};

export function BrowsePage({ mode }: { mode?: "trending" | "newest" | "all" }) {
  const isTrendingMode = mode === "trending";
  const {
    accessLevel,
    isPatron,
    isBasic,
    isAdmin,
    canAccess,
    profile,
    loading: authLoading,
    demoMode,
    login,
  } = useAuth();
  const { openAuthModal, toast } = useUI();
  const { sets, loading, error, reload } = useMediaSets();
  const { open, player } = useOpenMedia();
  const [params, setParams] = useSearchParams();

  const urlCategoryParam = params.get("category")?.toLowerCase() as CategoryFilter | null;
  const initialCategory: CategoryFilter =
    urlCategoryParam && categoryInfo[urlCategoryParam] ? urlCategoryParam : "all";

  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<SortOption>(isTrendingMode ? "trending" : "newest");

  const currentMeta = categoryInfo[category] || categoryInfo.all;
  useDocumentTitle(isTrendingMode ? "Trending Now" : currentMeta.title);

  const hasMembership = Boolean(profile) && (isPatron || isAdmin);

  // The library routes are members-only. Guests get the Patreon connect prompt
  // and signed-in accounts without a pack get the pack chooser instead of an
  // empty "no releases" page.
  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      openAuthModal("locked");
      return;
    }
    if (!isPatron && !isAdmin) {
      openAuthModal("purchase");
    }
  }, [authLoading, profile, isPatron, isAdmin, openAuthModal]);

  // Filter logic across categories, primary_type and search
  const filtered = useMemo(() => {
    let list = [...sets];

    // Category filter
    if (category !== "all") {
      if (category === "video") {
        list = list.filter((s) => s.primary_type === "video");
      } else if (category === "manga" || category === "comics") {
        list = list.filter((s) => s.category === "comics" || s.primary_type === "pdf");
      } else {
        list = list.filter((s) => s.category === category);
      }
    }

    // Search query filter
    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(needle) ||
          (s.description ?? "").toLowerCase().includes(needle) ||
          (s.genre ?? "").toLowerCase().includes(needle) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(needle)),
      );
    }

    // Sorting
    if (sort === "trending") {
      list.sort((a, b) => {
        if (a.views && b.views) return b.views - a.views;
        if (a.is_trending && !b.is_trending) return -1;
        if (!a.is_trending && b.is_trending) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sort === "newest") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "duration") {
      list.sort((a, b) => (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0));
    } else if (sort === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [sets, category, query, sort]);

  const totalFiles = filtered.reduce((total, s) => total + s.asset_count, 0);

  async function handleUnlock() {
    if (profile) {
      openAuthModal(isBasic ? "upgrade" : "inactive");
      return;
    }
    sessionStorage.setItem("lhh_post_login_path", `${window.location.pathname}${window.location.search}`);
    await login();
    if (demoMode) toast("Demo mode: signed in as verified patron. Vault unlocked.", "success");
  }

  function handleCategoryChange(cat: CategoryFilter) {
    setCategory(cat);
    if (cat === "all") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    setParams(params);
  }

  if (authLoading) {
    return (
      <div className="browse-page-wrapper">
        <section className="section browse-gate-section">
          <div className="container">
            <RowSkeleton count={6} />
          </div>
        </section>
      </div>
    );
  }

  if (!hasMembership) {
    return (
      <div className="browse-page-wrapper">
        <MembershipBanner />
        <section className="section browse-gate-section">
          <div className="container">
            <div className="browse-gate">
              <span className="browse-gate-icon" aria-hidden="true">
                <Lock size={26} />
              </span>
              <p className="eyebrow">Members only</p>
              <h1>{isTrendingMode ? "Trending Now" : currentMeta.title}</h1>
              <p className="browse-gate-copy">
                This part of Jerryhub is reserved for members. Connect your Patreon account to
                verify your membership, or choose a pack to unlock the library.
              </p>
              <div className="browse-gate-actions">
                {profile ? (
                  <button
                    type="button"
                    className="btn btn--patreon btn--lg btn--block"
                    onClick={() => openAuthModal("purchase")}
                  >
                    <PatreonMark size={18} /> Choose your pack
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--patreon btn--lg btn--block"
                    onClick={() => void handleUnlock()}
                  >
                    <PatreonMark size={18} /> Continue with Patreon
                  </button>
                )}
                <a
                  className="btn btn--ghost btn--block"
                  href={PATREON_PAGE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Join on Patreon <ExternalLink size={14} />
                </a>
              </div>
              <p className="browse-gate-fineprint">
                Basic Access from {BASIC_PRICE_LABEL}/mo · Full Access {FULL_PRICE_LABEL}/mo ·
                cancel anytime
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="browse-page-wrapper">
      <MembershipBanner />

      {/* Hero Header for Browse / Content Discovery */}
      <section className="library-hero browse-hero">
        <div className="library-hero-bg" aria-hidden="true">
          <img src={isTrendingMode ? POSTER_IMAGES[8] : POSTER_IMAGES[9]} alt="" />
          <div className="browse-hero-ambient" />
        </div>

        <div className="container library-hero-inner">
          <div className="browse-hero-copy">
            <div className="browse-eyebrow-row">
              <span className="browse-hero-kanji">{currentMeta.kanji}</span>
              <p className="eyebrow">
                {isTrendingMode ? (
                  <>
                    <Flame size={14} /> Most Popular Releases
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Curated Discovery
                  </>
                )}
              </p>
            </div>

            <h1 className="browse-title">{isTrendingMode ? "Trending Now" : currentMeta.title}</h1>
            <p className="browse-blurb">{currentMeta.blurb}</p>

            <div className="library-stats">
              <span className="stat-chip">
                <strong>{filtered.length}</strong> releases
              </span>
              <span className="stat-chip">
                <strong>{totalFiles}</strong> media files
              </span>
              <span className="stat-chip">
                <strong>2K</strong> uncensored
              </span>
              <span className="stat-chip">
                <strong>Daily</strong> additions
              </span>
            </div>
          </div>

          <div className="library-hero-actions">
            {isPatron ? (
              <span className="library-unlocked">
                <Sparkles size={16} /> {accessLabel(accessLevel)} active
              </span>
            ) : (
              <button type="button" className="btn btn--primary btn--lg" onClick={handleUnlock}>
                <Sparkles size={16} /> Explore Memberships
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filter and Discovery Control Bar */}
      <section className="browse-control-bar">
        <div className="container">
          <div className="browse-controls-inner">
            {/* Horizontal Category Nav Filter Pills */}
            <nav className="browse-categories-nav" aria-label="Filter categories">
              <button
                type="button"
                className={`browse-cat-pill${category === "all" ? " is-active" : ""}`}
                onClick={() => handleCategoryChange("all")}
              >
                <Compass size={13} />
                <span>All</span>
              </button>

              <button
                type="button"
                className={`browse-cat-pill${category === "animation" ? " is-active" : ""}`}
                onClick={() => handleCategoryChange("animation")}
              >
                <Film size={13} />
                <span>Animations</span>
              </button>

              <button
                type="button"
                className={`browse-cat-pill${category === "video" ? " is-active" : ""}`}
                onClick={() => handleCategoryChange("video")}
              >
                <Film size={13} />
                <span>Videos</span>
              </button>

              <button
                type="button"
                className={`browse-cat-pill${category === "arts" ? " is-active" : ""}`}
                onClick={() => handleCategoryChange("arts")}
              >
                <ImageIcon size={13} />
                <span>Arts</span>
              </button>

              <button
                type="button"
                className={`browse-cat-pill${category === "games" ? " is-active" : ""}`}
                onClick={() => handleCategoryChange("games")}
              >
                <Gamepad2 size={13} />
                <span>2D Games</span>
              </button>

              <button
                type="button"
                className={`browse-cat-pill${category === "manga" ? " is-active" : ""}`}
                onClick={() => handleCategoryChange("manga")}
              >
                <BookOpen size={13} />
                <span>Manga</span>
              </button>

              <button
                type="button"
                className={`browse-cat-pill${category === "comics" ? " is-active" : ""}`}
                onClick={() => handleCategoryChange("comics")}
              >
                <BookOpen size={13} />
                <span>Comics</span>
              </button>
            </nav>

            {/* Search Input & Sort Selector */}
            <div className="browse-search-sort-group">
              <div className="browse-search-box">
                <Search size={14} className="browse-search-icon" />
                <input
                  type="search"
                  placeholder="Filter by keyword, genre, tag..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="browse-search-input"
                />
                {query && (
                  <button
                    type="button"
                    className="browse-search-clear"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="browse-sort-select-wrap">
                <SlidersHorizontal size={13} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="browse-sort-select"
                  aria-label="Sort content"
                >
                  <option value="newest">Newest First</option>
                  <option value="trending">Most Popular</option>
                  <option value="duration">Longest Duration</option>
                  <option value="title">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Responsive Content Poster Grid */}
      <section className="section browse-grid-section">
        <div className="container">
          {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

          {loading ? (
            <RowSkeleton count={8} />
          ) : filtered.length === 0 ? (
            <div className="browse-empty-state">
              <Search size={36} />
              <h3>No releases matched your criteria</h3>
              <p>Try clearing your search query or selecting a different category filter.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setQuery("");
                  handleCategoryChange("all");
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="poster-grid" data-category={category}>
              {filtered.map((set, index) => (
                <MediaCard
                  key={set.id}
                  set={set}
                  locked={!canAccess(set.access_level)}
                  onOpen={open}
                  onLocked={open}
                  variant="grid"
                  index={index + 1}
                />
              ))}
              <UnlockMoreCard
                category={category === "arts" || category === "games" || category === "comics" ? category : "all"}
                count="+500"
                title="Unlock Entire Vault Library"
                subtitle="Hundreds of unrated full-length releases locked for VIP members"
                badge="MEMBERS ONLY"
                variant="grid"
                aspectRatio={category === "games" ? "16:9" : "a4"}
                index={filtered.length + 1}
              />
            </div>
          )}

          {/* Bottom Conversion Strip for Non-Patrons */}
          {!isPatron && filtered.length > 0 && (
            <div className="browse-conversion-panel">
              <div className="browse-conv-copy">
                <span className="browse-conv-badge">Membership Access</span>
                <h3>Get access starting from {BASIC_PRICE_LABEL}/month</h3>
                <p>
                  Basic Access from {BASIC_PRICE_LABEL} opens the entry-level premium collection.
                  Full Access at {FULL_PRICE_LABEL} includes everything in Basic plus all available
                  premium content, 2K streaming and offline downloads.
                </p>
              </div>
              <button type="button" className="btn btn--primary btn--lg" onClick={handleUnlock}>
                <Sparkles size={16} /> Explore Memberships <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Upgrade strip for Basic members viewing Full-only releases */}
          {isBasic && filtered.some((set) => !canAccess(set.access_level)) && (
            <div className="browse-conversion-panel">
              <div className="browse-conv-copy">
                <span className="browse-conv-badge">Full Access</span>
                <h3>Unlock every Full Access release</h3>
                <p>
                  Your Basic Access membership covers the entry-level collection. Upgrade to Full
                  Access for {FULL_PRICE_LABEL} to open all available premium content.
                </p>
              </div>
              <a
                className="btn btn--primary btn--lg"
                href={PATREON_PAGE_URL}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Sparkles size={16} /> {UPGRADE_CTA_LABEL}
              </a>
            </div>
          )}
        </div>
      </section>

      {player}
    </div>
  );
}
