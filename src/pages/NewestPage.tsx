import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Film,
  Flame,
  Gamepad2,
  Image as ImageIcon,
  Lock,
  Sparkles,
} from "lucide-react";
import { MediaCard } from "../components/MediaCard";
import { MembershipBanner, ErrorBanner } from "../components/MembershipBanner";
import { RowSkeleton } from "../components/Skeletons";
import { useAuth } from "../context/AuthContext";
import { useSiteAssets } from "../context/SiteAssetsContext";
import { useUI } from "../context/UIContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMediaSets } from "../hooks/useMediaSets";
import { useOpenMedia } from "../hooks/useOpenMedia";
import { BASIC_PRICE_LABEL, FULL_PRICE_LABEL, PATREON_PAGE_URL } from "../lib/config";
import { POSTER_IMAGES } from "../data/posters";
import type { MediaCategory, MediaSet } from "../lib/types";

type NewestFilter = "all" | MediaCategory;

const filters: Array<{ value: NewestFilter; label: string; icon: typeof Flame }> = [
  { value: "all", label: "Everything", icon: Compass },
  { value: "animation", label: "Animations", icon: Film },
  { value: "arts", label: "Image Sets", icon: ImageIcon },
  { value: "comics", label: "Manga + Comics", icon: BookOpen },
  { value: "games", label: "2D Games", icon: Gamepad2 },
];

/**
 * Newest Uploads — a dedicated page listing every published set by upload date.
 *
 * This is the freshest-first view of the whole library. It deliberately does not
 * reuse the Browse page: Browse is a filtered discovery surface, while this page
 * answers one question only — what landed most recently.
 */
export function NewestPage() {
  useDocumentTitle("Newest Uploads");
  const { isPatron, isAdmin, canAccess, profile, loading: authLoading } = useAuth();
  const { openAuthModal } = useUI();
  const { getImage } = useSiteAssets();
  const { sets, loading, error, reload } = useMediaSets();
  const { open, player } = useOpenMedia();
  const [filter, setFilter] = useState<NewestFilter>("all");

  const hasMembership = Boolean(profile) && (isPatron || isAdmin);

  const newest = useMemo(() => {
    const list = sets
      .filter((set) => !set.is_showcase && (set.asset_count ?? 0) > 0)
      .filter((set) => (filter === "all" ? true : set.category === filter))
      .sort(
        (a: MediaSet, b: MediaSet) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    return list;
  }, [sets, filter]);

  const banner = getImage("section-newest", POSTER_IMAGES[4]);

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
              <h1>Newest Uploads</h1>
              <p className="browse-gate-copy">
                Fresh drops land here first. Connect your Patreon account to verify your
                membership and open the newest releases.
              </p>
              <div className="browse-gate-actions">
                <button
                  type="button"
                  className="btn btn--patreon btn--lg btn--block"
                  onClick={() => openAuthModal(profile ? "purchase" : "locked")}
                >
                  <Sparkles size={18} /> {profile ? "Choose your pack" : "Continue with Patreon"}
                </button>
                <a
                  className="btn btn--ghost btn--block"
                  href={PATREON_PAGE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Join on Patreon
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

      <section className="library-hero browse-hero">
        <div className="library-hero-bg" aria-hidden="true">
          <img src={banner} alt="" />
          <div className="browse-hero-ambient" />
        </div>

        <div className="container library-hero-inner">
          <div className="browse-hero-copy">
            <div className="browse-eyebrow-row">
              <span className="browse-hero-kanji">新着</span>
              <p className="eyebrow">
                <Sparkles size={14} /> Straight off the upload queue
              </p>
            </div>
            <h1 className="browse-title">Newest Uploads</h1>
            <p className="browse-blurb">
              Every release in the vault, ordered by the moment it landed. New image sets,
              chapters and drops appear here the second they are published.
            </p>
            <div className="library-stats">
              <span className="stat-chip">
                <strong>{newest.length}</strong> releases
              </span>
              <span className="stat-chip">
                <strong>
                  {newest.reduce((total, set) => total + (set.asset_count ?? 0), 0)}
                </strong>{" "}
                media files
              </span>
              <span className="stat-chip">
                <strong>Daily</strong> additions
              </span>
            </div>
          </div>

          <div className="library-hero-actions">
            <Link to="/browse" className="btn btn--ghost btn--lg">
              Browse all <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="browse-control-bar">
        <div className="container">
          <nav className="browse-categories-nav" aria-label="Filter newest uploads">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`browse-cat-pill${filter === item.value ? " is-active" : ""}`}
                onClick={() => setFilter(item.value)}
              >
                <item.icon size={13} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </section>

      <section className="section browse-grid-section">
        <div className="container">
          {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

          {loading ? (
            <RowSkeleton count={8} />
          ) : newest.length === 0 ? (
            <div className="browse-empty-state">
              <ImageIcon size={36} />
              <h3>Nothing uploaded here yet</h3>
              <p>
                {filter === "all"
                  ? "New releases appear here as soon as they are published."
                  : "No releases in this collection yet. Try another filter."}
              </p>
              {filter !== "all" && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setFilter("all")}
                >
                  Show everything
                </button>
              )}
            </div>
          ) : (
            <div className="poster-grid" data-category={filter}>
              {newest.map((set, index) => (
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
            </div>
          )}
        </div>
      </section>

      {player}
    </div>
  );
}
