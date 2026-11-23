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

const BASIC_SLOTS = 3;

/**
 * Empty library entries ("Set 15", "manga3") are leftover placeholders from the
 * storefront build. They stay available in the admin library but never appear
 * in the public homepage rows until real files are added to them.
 */
function hasRealContent(set: MediaSet): boolean {
  return !set.is_showcase && (set.asset_count ?? 0) > 0;
}

/**
 * Storefront tiering: the first three posters of every section are Basic
 * Access, the rest are Full Access only. Sections marked `allFull` (2D Games)
 * are Full Access exclusively.
 */
function tierSection(items: MediaSet[], allFull = false): MediaSet[] {
  return items.map((set, index) => ({
    ...set,
    access_level: allFull || index >= BASIC_SLOTS ? "full" : "basic",
  }));
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
  // Real, populated library sets only — no showcase posters, no empty placeholders.
  const trendingList = tierSection(
    [...sets]
      .filter(
        (s) =>
          hasRealContent(s) &&
          (s.is_trending || (s.views ?? 0) > 80000),
      )
      .sort(trendingSort)
      .slice(0, 10),
  );

  // SECTION 3: NSFW Image Sets (adult art galleries only — comics excluded)
  // Real, populated library sets only — no showcase posters, no empty placeholders.
  const nsfwImageSets = tierSection(
    sets
      .filter(
        (s) =>
          hasRealContent(s) &&
          s.category === "arts" &&
          s.primary_type === "image",
      )
      .sort(newestFirst)
      .slice(0, 10),
  );

  // SECTION 4: Manga + Comics (Separate digital manga & illustrated comic library)
  // Real, populated library sets only — no showcase posters, no empty placeholders.
  const mangaComicsList = tierSection(
    sets
      .filter((s) => hasRealContent(s) && s.category === "comics")
      .sort(newestFirst)
      .slice(0, 10),
  );

  // SECTION 5: 2D Games (Separate discovery library for 2D games, VNs, RPGs)
  // Games are Full Access only and shown as Coming Soon until launch.
  const gamesList = tierSection(
    fillToTen(
      sets.filter((s) => s.category === "games").sort(newestFirst),
      showcaseGames,
    ),
    true,
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
          SECTION 3 — NSFW IMAGE SETS (Adult art galleries only)
          ============================================================ */}
      <section className="section library-section library-section--nsfw" id="nsfw-images">
        <div className="container">
          <Reveal>
            <SectionHeader
              eyebrow="18+ · Uncensored art vault"
              title="NSFW Image Sets"
              description="Full-resolution adult art collections — uncensored stills, complete galleries and every new drop, with nothing held back."
              action={
                <Link to="/newest?category=arts" className="link-arrow">
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
          SECTION 4 — MANGA + COMICS (Separate Digital Library)
          ============================================================ */}
      <section className="section library-section library-section--comics" id="manga-comics">
        <div className="container">
          <Reveal>
            <SectionHeader
              eyebrow="The digital reading room"
              title="Manga + Comics"
              description="Portrait-oriented illustrated stories, serialized webcomics and dark fantasy manga in crisp high-resolution."
              action={
                <Link to="/newest?category=comics" className="link-arrow">
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
          SECTION 5 — 2D GAMES (Separate Discovery Library, last row)
          ============================================================ */}
      <section className="section library-section library-section--games" id="games">
        <div className="container">
          <Reveal>
            <SectionHeader
              eyebrow="Playable entertainment"
              title="2D Games"
              description="Interactive choice-driven visual novels, fantasy RPG adventures and retro arcade nights with unlocked gallery scenes."
              action={
                <Link to="/newest?category=games" className="link-arrow">
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
