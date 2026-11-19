import { HUB_POSTER_FILES, POSTER_IMAGES } from "../data/posters";

/**
 * Every image the admin can replace on the public site. Slots are intentionally
 * unique: one slot controls exactly one place on the site, so the dashboard
 * never renders a duplicate section for the same banner.
 */
export type SiteSection = "hero" | "sections" | "browse" | "account" | "age-gate";

export interface SiteSectionMeta {
  id: SiteSection;
  title: string;
  description: string;
}

export interface SiteSlot {
  slot: string;
  section: SiteSection;
  label: string;
  fallback: string;
  aspect: "portrait" | "landscape";
}

export const SITE_SECTIONS: SiteSectionMeta[] = [
  {
    id: "hero",
    title: "Hero poster wall",
    description:
      "The drifting poster wall behind the homepage hero headline. Showcase cards using the same artwork update too.",
  },
  {
    id: "sections",
    title: "Section banners",
    description: "Artwork used by the unlock card at the end of each homepage row.",
  },
  {
    id: "browse",
    title: "Browse page banners",
    description: "Background artwork for the Browse and Trending page headers.",
  },
  {
    id: "account",
    title: "Account artwork",
    description: "Illustration shown to signed-out visitors on the account page.",
  },
  {
    id: "age-gate",
    title: "Age gate collage",
    description: "The six images behind the 18+ verification screen.",
  },
];

export const SITE_SLOTS: SiteSlot[] = [
  ...HUB_POSTER_FILES.map((fallback, index) => ({
    slot: `marquee-${String(index + 1).padStart(2, "0")}`,
    section: "hero" as const,
    label: `Poster wall ${index + 1}`,
    fallback,
    aspect: "portrait" as const,
  })),
  {
    slot: "section-trending",
    section: "sections",
    label: "Trending Now banner",
    fallback: POSTER_IMAGES[3],
    aspect: "portrait",
  },
  {
    slot: "section-newest",
    section: "sections",
    label: "Newest Uploads banner",
    fallback: POSTER_IMAGES[4],
    aspect: "portrait",
  },
  {
    slot: "section-arts",
    section: "sections",
    label: "Exclusive Arts + Videos banner",
    fallback: POSTER_IMAGES[2],
    aspect: "portrait",
  },
  {
    slot: "section-games",
    section: "sections",
    label: "2D Games banner",
    fallback: POSTER_IMAGES[12],
    aspect: "portrait",
  },
  {
    slot: "section-comics",
    section: "sections",
    label: "Manga + Comics banner",
    fallback: POSTER_IMAGES[5],
    aspect: "portrait",
  },
  {
    slot: "section-all",
    section: "sections",
    label: "Full library banner",
    fallback: POSTER_IMAGES[6],
    aspect: "portrait",
  },
  {
    slot: "browse-trending",
    section: "browse",
    label: "Trending page banner",
    fallback: POSTER_IMAGES[8],
    aspect: "landscape",
  },
  {
    slot: "browse-all",
    section: "browse",
    label: "Browse page banner",
    fallback: POSTER_IMAGES[9],
    aspect: "landscape",
  },
  {
    slot: "account-guest",
    section: "account",
    label: "Signed-out account artwork",
    fallback: POSTER_IMAGES[3],
    aspect: "portrait",
  },
  ...POSTER_IMAGES.slice(0, 6).map((fallback, index) => ({
    slot: `age-gate-${String(index + 1).padStart(2, "0")}`,
    section: "age-gate" as const,
    label: `Collage image ${index + 1}`,
    fallback,
    aspect: "portrait" as const,
  })),
];

export const SITE_SLOTS_BY_SECTION = SITE_SECTIONS.map((section) => ({
  ...section,
  slots: SITE_SLOTS.filter((slot) => slot.section === section.id),
}));

/**
 * Showcase cards reuse the same bundled poster artwork as the hero wall. This
 * maps a showcase thumbnail back to the slot that owns that artwork so an
 * admin replacement is reflected in both places without a second slot.
 */
export function posterSlotForImage(src: string): string | null {
  const index = (POSTER_IMAGES as readonly string[]).indexOf(src);
  return index >= 0 ? `marquee-${String(index + 1).padStart(2, "0")}` : null;
}
