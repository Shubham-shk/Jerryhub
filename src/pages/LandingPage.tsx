import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Carousel } from "../components/Carousel";
import { MediaCard } from "../components/MediaCard";
import { MembershipBanner, ErrorBanner } from "../components/MembershipBanner";
import { Reveal } from "../components/Reveal";
import { SectionHeader } from "../components/SectionHeader";
import { RowSkeleton } from "../components/Skeletons";
import { AccessStrip } from "../components/landing/AccessStrip";
import { HeroSlideshow } from "../components/landing/HeroSlideshow";
import { UnlockMoreCard } from "../components/UnlockMoreCard";
import { PricingBanner } from "../components/landing/PricingBanner";
import { Features } from "../components/landing/Features";
import { HowItWorks } from "../components/landing/HowItWorks";
import { FAQAccordion } from "../components/landing/FAQAccordion";
import { FinalCTA } from "../components/landing/FinalCTA";
import { useAuth } from "../context/AuthContext";
import { useSiteAssets } from "../context/SiteAssetsContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMediaSets } from "../hooks/useMediaSets";
import { useOpenMedia } from "../hooks/useOpenMedia";
import { SHOWCASE_SETS } from "../data/showcase";
import { posterSlotForImage } from "../lib/siteSlots";
import type { MediaSet } from "../lib/types";

const newestFirst = (a: MediaSet, b: MediaSet) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const trendingSort = (a: MediaSet, b: MediaSet) => {
  if (a.views && b.views) return b.views - a.views;
  if (a.is_trending && !b.is_trending) return -1;
  if (!a.is_trending && b.is_trending) return 1;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

/**
 * Showcase cards reuse the bundled poster artwork. When an admin replaces that
 * artwork in the Site artwork manager, the same replacement appears on the
 * matching catalogue cards without a second slot.
 */
function withSiteArtwork(
  sets: MediaSet[],
  getImage: (slot: string, fallback: string) => string,
): MediaSet[] {
  return sets.map((set) => {
    const slot = posterSlotForImage(set.thumbnail_path);
    return slot ? { ...set, thumbnail_path: getImage(slot, set.thumbnail_path) } : set;
  });
}

/**
 * Every homepage section shows a full row of ten posters. Published library
 * sets always come first; showcase posters fill the rest so the storefront
 * never looks empty while the private library is still being stocked.
 */
function fillToTen(real: MediaSet[], showcase: MediaSet[]): MediaSet[] {
  const seen = new Set(real.map((set) => set.id));
  const items = [...real];
  for (const item of showcase) {
    if (items.length >= 10) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items.slice(0, 10);
}

/**
 * Empty library entries ("Set 15", "manga3") are leftover placeholders from the
 * storefront build. They stay available in the admin library but never appear
 * in the public homepage rows until real files are added to them.
 */
function hasRealContent(set: MediaSet): boolean {
  return !set.is_showcase && (set.asset_count ?? 0) > 0;
}

/**
 * A set is worth showing when it has files, or when an admin explicitly marked
 * it trending. Empty placeholder rows stay out of the public rows, but a set the
 * admin just created and flagged shows up immediately — even before its files
 * finish uploading.
 */
function isVisibleSet(set: MediaSet): boolean {
  return !set.is_showcase && (hasRealContent(set) || Boolean(set.is_trending));
}

export function LandingPage() {
  useDocumentTitle("");
  const { canAccess } = useAuth();
  const { sets, loading, error, reload } = useMediaSets();
  const { open, player } = useOpenMedia();
  const { getImage } = useSiteAssets();

  // Only the 2D Games row still uses bundled showcase posters as filler.
  const showcaseGames = useMemo(
    () =>
      withSiteArtwork(
        SHOWCASE_SETS.filter((set) => set.category === "games").sort(newestFirst),
        getImage,
      ),
    [getImage],
  );

  // SECTION 2: Trending (Aggregates ALL categories: animation, arts, games, comics based on popularity/views)
  // Real, populated library sets plus sets the admin explicitly flagged as
  // Trending, so a newly created set can rank before its files finish uploading.
  // The view threshold is a preference, not a gate: a freshly published album has
  // no view history yet and must still be able to rank here.
  // The stored access_level is the single source of truth for every poster —
  // an admin toggling Basic/Full Access sees the badge change immediately.
  const trendingList = sets
    .filter((s) => isVisibleSet(s) && (s.is_trending || (s.views ?? 0) > 0 || s.is_new))
    .sort(trendingSort)
    .slice(0, 10);

  // SECTION 3: Newest Uploads (fresh releases, right under Trending)
  // Newest-first view of everything the admin has published with files, plus
  // sets explicitly flagged trending so a just-created set is never invisible.
  const newestList = sets.filter(isVisibleSet).sort(newestFirst).slice(0, 10);

  // SECTION 4: NSFW Image Sets (adult art galleries — comics and games excluded)
  // Every published image set with real files is listed, whatever its library
  // category, plus image sets explicitly flagged Trending so an admin who drops
  // images into a set cannot end up with a set that exists but never appears here.
  const nsfwImageSets = sets
    .filter(
      (s) =>
        isVisibleSet(s) &&
        s.category !== "comics" &&
        s.category !== "games" &&
        (s.primary_type === "image" || s.category === "arts"),
    )
    .sort(newestFirst)
    .slice(0, 10);

  // SECTION 5: Manga + Comics (Separate digital manga & illustrated comic library)
  // Every published comics set is listed as soon as it is created — chapters are
  // uploaded one at a time, so we cannot wait for `asset_count` to climb before
  // showing the set. Bundled showcase posters are still excluded.
  const mangaComicsList = sets
    .filter((s) => !s.is_showcase && s.category === "comics")
    .sort(newestFirst)
    .slice(0, 10);

  // SECTION 6: 2D Games (Separate discovery library for 2D games, VNs, RPGs)
  // Games are shown as Coming Soon until launch; their stored access_level still
  // drives the badge, so the admin toggle works here too.
  const gamesList = fillToTen(
    sets.filter((s) => s.category === "games").sort(newestFirst),
    showcaseGames,
  ).map((set) => ({ ...set, coming_soon: true }));

  return (
    <>
      {/* ============================================================
          SECTION 1 — FEATURED ARTWORK SLIDESHOW (Top of Homepage)
          ============================================================ */}
      <HeroSlideshow />

      {/* ============================================================
          SECTION 2 — TRENDING NOW (Aggregates ALL content categories)
          ============================================================ */}
      <section className="section library-section library-section--trending" id="trending">
        <MembershipBanner />
        <div className="container">
          {error && <ErrorBanner message={error} onRetry={() => void reload()} />}
          
          <Reveal>
            <AccessStrip />
          </Reveal>

          <Reveal delay={60}>
            <SectionHeader
              eyebrow="Most watched &amp; played this week"
              title="Trending Now"
              description="Unified top releases across animation, 2D games, manga and exclusive art galleries."
              action={
                <Link to="/trending" className="link-arrow">
                  <span>View full rankings</span>
                  <ArrowRight size={15} />
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={120}>
            {loading ? (
              <RowSkeleton count={5} />
            ) : (
              <Carousel label="Trending Now">
                {trendingList.map((set, index) => (
                  <MediaCard
                    key={set.id}
                    set={set}
                    locked={!canAccess(set.access_level)}
                    onOpen={open}
                    onLocked={open}
                    variant="carousel"
                    index={index + 1}
                    showRank={true}
                  />
                ))}
                <UnlockMoreCard
                  category="trending"
                  count="+500"
                  title="Unlock 500+ More Trending"
                  subtitle="Uncensored 2K animation, games & high-res art"
                  badge="VIP VAULT"
                  variant="carousel"
                  index={trendingList.length + 1}
                />
              </Carousel>
            )}
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — NEWEST UPLOADS (Fresh releases, moved from navbar)
          ============================================================ */}
      <section className="section library-section library-section--newest" id="newest-uploads">
        <div className="container">
          <Reveal>
            <SectionHeader
              eyebrow="Straight off the upload queue"
              title="Newest Uploads"
              description="The freshest releases in the vault, ordered by the moment they landed."
              action={
                <Link to="/newest" className="link-arrow">
                  <span>View all uploads</span>
                  <ArrowRight size={15} />
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={90}>
            {loading ? (
              <RowSkeleton count={5} />
            ) : (
              <Carousel label="Newest Uploads">
                {newestList.map((set, index) => (
                  <MediaCard
                    key={set.id}
                    set={set}
                    locked={!canAccess(set.access_level)}
                    onOpen={open}
                    onLocked={open}
                    variant="carousel"
                    index={index + 1}
                  />
                ))}
                <UnlockMoreCard
                  category="newest"
                  count="+1,200"
                  title="Explore 1,200+ Vault Archives"
                  subtitle="Daily uncensored drops added to the private library"
                  badge="NEW DROPS"
                  variant="carousel"
                  index={newestList.length + 1}
                />
              </Carousel>
            )}
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — NSFW IMAGE SETS (Adult art galleries only)
          ============================================================ */}
      <section className="section library-section library-section--nsfw" id="nsfw-images">
        <div className="container">
          <Reveal>
            <SectionHeader
              eyebrow="18+ · Uncensored art vault"
              title="NSFW Image Sets"
              description="Full-resolution adult art collections — uncensored stills, complete galleries and every new drop, with nothing held back."
              action={
                <Link to="/browse?category=arts" className="link-arrow">
                  <span>Browse all image sets</span>
                  <ArrowRight size={15} />
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={90}>
            {loading ? (
              <RowSkeleton count={5} />
            ) : (
              <Carousel label="NSFW Image Sets">
                {nsfwImageSets.map((set, index) => (
                  <MediaCard
                    key={set.id}
                    set={set}
                    locked={!canAccess(set.access_level)}
                    onOpen={open}
                    onLocked={open}
                    variant="carousel"
                    index={index + 1}
                  />
                ))}
                <UnlockMoreCard
                  category="arts"
                  count="+2,400"
                  title="Unlock 2,400+ NSFW Artworks"
                  subtitle="4K galleries, uncensored sets & full-resolution drops"
                  badge="18+ VAULT"
                  variant="carousel"
                  index={nsfwImageSets.length + 1}
                />
              </Carousel>
            )}
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — MANGA + COMICS (Separate Digital Library)
          ============================================================ */}
      <section className="section library-section library-section--comics" id="manga-comics">
        <div className="container">
          <Reveal>
            <SectionHeader
              eyebrow="The digital reading room"
              title="Manga + Comics"
              description="Portrait-oriented illustrated stories, serialized webcomics and dark fantasy manga in crisp high-resolution."
              action={
                <Link to="/browse?category=comics" className="link-arrow">
                  <span>View All Manga</span>
                  <ArrowRight size={15} />
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={90}>
            {loading ? (
              <RowSkeleton count={5} />
            ) : (
              <>
                {!mangaComicsList.length && (
                  <p className="section-empty-note">
                    New chapters are in production — fresh drops land here first.
                  </p>
                )}
                <Carousel label="Manga + Comics">
                  {mangaComicsList.map((set, index) => (
                    <MediaCard
                      key={set.id}
                      set={set}
                      locked={!canAccess(set.access_level)}
                      onOpen={open}
                      onLocked={open}
                      variant="carousel"
                      index={index + 1}
                    />
                  ))}
                  <UnlockMoreCard
                    category="comics"
                    count="+350"
                    title="Unlock 350+ Manga Chapters"
                    subtitle="Unrated serialized chapters in reading room"
                    badge="MANGA VAULT"
                    variant="carousel"
                    index={mangaComicsList.length + 1}
                  />
                </Carousel>
              </>
            )}
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — 2D GAMES (Separate Discovery Library, last row)
          ============================================================ */}
      <section className="section library-section library-section--games" id="games">
        <div className="container">
          <Reveal>
            <SectionHeader
              eyebrow="Playable entertainment"
              title="2D Games"
              description="Interactive choice-driven visual novels, fantasy RPG adventures and retro arcade nights with unlocked gallery scenes."
              action={
                <Link to="/browse?category=games" className="link-arrow">
                  <span>View All Games</span>
                  <ArrowRight size={15} />
                </Link>
              }
            />
          </Reveal>

          <Reveal delay={90}>
            {loading ? (
              <RowSkeleton count={5} />
            ) : (
              <Carousel label="2D Games">
                {gamesList.map((set, index) => (
                  <MediaCard
                    key={set.id}
                    set={set}
                    locked={!canAccess(set.access_level)}
                    onOpen={open}
                    onLocked={open}
                    variant="carousel"
                    index={index + 1}
                    aspectRatio="16:9"
                    comingSoon
                  />
                ))}
                <UnlockMoreCard
                  category="games"
                  count="+40"
                  title="Unlock 40+ Playable 2D Games"
                  subtitle="Visual novels, RPG routes & complete gallery scenes"
                  badge="PLAYABLE"
                  variant="carousel"
                  aspectRatio="16:9"
                  index={gamesList.length + 1}
                />
              </Carousel>
            )}
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          MEMBERSHIP VALUE PROP & SUPPORTING SECTIONS
          ============================================================ */}
      <PricingBanner />
      <Features />
      <HowItWorks />

      {/* FAQ Section */}
      <section className="section faq-section" id="faq">
        <div className="container faq-layout">
          <div className="faq-intro">
            <p className="eyebrow">Clear Answers, Zero Friction</p>
            <h2 className="section-title">Frequently asked questions</h2>
            <p>
              Everything about Patreon verification, 2K streaming, offline downloads and device compatibility.
            </p>
            <div className="faq-intro-card">
              <span className="faq-intro-price">From $5<span>/mo</span></span>
              <p>Basic Access from $5 or Full Access at $9.50. Cancel anytime on Patreon.</p>
              <Link to="/faq" className="link-arrow">
                <span>View all questions</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <FAQAccordion />
        </div>
      </section>

      <FinalCTA />
      {player}
    </>
  );
}
