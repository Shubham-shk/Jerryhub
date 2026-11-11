import { POSTER_IMAGES } from "./posters";
import type { MediaCategory, MediaSet, MediaType } from "../lib/types";

/**
 * Homepage showcase posters.
 *
 * The landing page is the main sales pitch, so every section always shows a
 * full row of ten posters even when the private library is still being filled.
 * These entries are marketing previews built from the artwork that already
 * ships with the site. They are flagged with `is_showcase` and can never open
 * the media player: clicking one opens the Patreon join / login prompt instead.
 *
 * Real published sets always come first. Showcase posters only fill the gap
 * until the library has enough content of its own.
 */

interface ShowcaseSeed {
  title: string;
  genre: string;
  description: string;
  image: number;
  primary: MediaType;
  access: "basic" | "full";
}

const animationSeeds: ShowcaseSeed[] = [
  {
    title: "Got Pregnant - Full Set",
    genre: "Drama Animation",
    description:
      "A slow-burn story with polished 2K art, deliberate pacing and a fully synchronized interactive experience.",
    image: 0,
    primary: "video",
    access: "basic",
  },
  {
    title: "Professor Secret of Account",
    genre: "Drama Animation",
    description:
      "A professor with a secret second life, a private account and one student who finds it.",
    image: 1,
    primary: "video",
    access: "basic",
  },
  {
    title: "NTR Gone Wrong - Full Collection",
    genre: "Drama Animation",
    description:
      "A tense relationship drama with sharp direction, expressive animation and a tightly timed interactive script.",
    image: 2,
    primary: "video",
    access: "full",
  },
  {
    title: "Momo Ayase Pack - 1/2",
    genre: "Character Animation",
    description:
      "A playful animated release with bright color, expressive motion and a 2K master built for late nights.",
    image: 3,
    primary: "video",
    access: "full",
  },
  {
    title: "Aunt Marry",
    genre: "Family Drama Animation",
    description:
      "A warm family drama with a mature edge, hand-finished 2K frames and a patient cinematic pace.",
    image: 4,
    primary: "video",
    access: "full",
  },
  {
    title: "Midnight Velvet",
    genre: "2K Short Film",
    description:
      "A rain-soaked 2K animation with rich neon reflections and smooth pacing.",
    image: 5,
    primary: "video",
    access: "full",
  },
  {
    title: "Neon Temptation",
    genre: "2K Short Film",
    description:
      "A neon-lit 2K short film with cinematic lighting and an immersive edit.",
    image: 6,
    primary: "video",
    access: "full",
  },
  {
    title: "After Hours: Vol. 1",
    genre: "Late Night Animation",
    description:
      "Late-night animation with moody lighting and a slow, deliberate build.",
    image: 7,
    primary: "video",
    access: "full",
  },
  {
    title: "Sugar & Static",
    genre: "Character Animation",
    description:
      "A bright, high-energy animation with crisp 2K frames and playful motion.",
    image: 8,
    primary: "video",
    access: "full",
  },
  {
    title: "Room 404",
    genre: "Mystery Animation",
    description:
      "A mysterious hotel story with atmospheric animation and a twist ending.",
    image: 9,
    primary: "video",
    access: "full",
  },
];

const artsSeeds: ShowcaseSeed[] = [
  {
    title: "Goth Friend Got Some Problems",
    genre: "Moody Editorial",
    description:
      "A moody aesthetic gallery with warm cinematic grading, exclusive stills and a high-DPI art-book finish.",
    image: 3,
    primary: "image",
    access: "basic",
  },
  {
    title: "Mikasa - Part 1 (Exclusive)",
    genre: "Character Art Gallery",
    description:
      "A high-resolution character gallery with dramatic lighting, detailed linework and exclusive bonus frames.",
    image: 4,
    primary: "image",
    access: "basic",
  },
  {
    title: "Bath with Stepsis",
    genre: "Bath Editorial",
    description:
      "A soft-lit gallery with reflective water, warm skin tones and a polished editorial finish.",
    image: 5,
    primary: "image",
    access: "full",
  },
  {
    title: "The Art of Seduction",
    genre: "Editorial Pin-Up",
    description:
      "An exclusive illustrated art set with editorial lighting and velvet textures.",
    image: 6,
    primary: "image",
    access: "full",
  },
  {
    title: "Moonlit Ritual",
    genre: "Cinematic Gallery",
    description:
      "A moonlit gallery of high-DPI stills with cool tones and cinematic shadows.",
    image: 7,
    primary: "image",
    access: "full",
  },
  {
    title: "Velvet Frequencies",
    genre: "Editorial Gallery",
    description:
      "An editorial gallery with velvet textures, neon accents and exclusive frames.",
    image: 8,
    primary: "image",
    access: "full",
  },
  {
    title: "Static Bloom",
    genre: "Art Collection",
    description:
      "A floral-inspired art set with soft color, sharp detail and a premium finish.",
    image: 9,
    primary: "image",
    access: "full",
  },
  {
    title: "Lingerie Noir",
    genre: "Black & White Editorial",
    description:
      "A black-and-white editorial gallery with high-contrast lighting.",
    image: 10,
    primary: "image",
    access: "full",
  },
  {
    title: "Silk & Smoke",
    genre: "Soft Focus Gallery",
    description:
      "A smoky, soft-focus art collection with silk textures and warm highlights.",
    image: 11,
    primary: "image",
    access: "full",
  },
  {
    title: "Neon Skin",
    genre: "Neon Portrait Gallery",
    description:
      "A neon-lit portrait gallery with vivid color and crisp high-DPI detail.",
    image: 12,
    primary: "image",
    access: "full",
  },
];

const gamesSeeds: ShowcaseSeed[] = [
  {
    title: "Tomboy Friend's Night Visit",
    genre: "Choice Adventure / VN",
    description:
      "A special-edition visual novel where every route opens a new scene. Multiple endings, one very long night.",
    image: 8,
    primary: "video",
    access: "basic",
  },
  {
    title: "Stepsis Thinks She Is Chubby",
    genre: "Step-Sibling Game",
    description:
      "A playful game with expressive sprites, unlockable gallery scenes and multiple endings.",
    image: 9,
    primary: "video",
    access: "basic",
  },
  {
    title: "Sylphiette Greyrat",
    genre: "Fantasy Character Game",
    description:
      "A fantasy character route with hand-drawn scenes, companion dialogue and secret unlockable encounters.",
    image: 10,
    primary: "video",
    access: "full",
  },
  {
    title: "Cyber Arcade Romance",
    genre: "Choice Adventure / VN",
    description:
      "A neon arcade visual novel with multiple routes and secret bonus encounters.",
    image: 11,
    primary: "video",
    access: "full",
  },
  {
    title: "Velvet Arcade",
    genre: "Retro Romance Game",
    description:
      "A retro arcade romance with unlockable scenes and multiple endings.",
    image: 12,
    primary: "video",
    access: "full",
  },
  {
    title: "Neon Choices",
    genre: "Choice Adventure / VN",
    description:
      "A choice-driven story where every decision opens a new route.",
    image: 13,
    primary: "video",
    access: "full",
  },
  {
    title: "Midnight Quest",
    genre: "Fantasy RPG",
    description:
      "A fantasy RPG adventure with companion routes and hidden gallery scenes.",
    image: 14,
    primary: "video",
    access: "full",
  },
  {
    title: "Pixel Temptation",
    genre: "Pixel Dating Sim",
    description:
      "A pixel-art dating sim with unlockable scenes and multiple endings.",
    image: 15,
    primary: "video",
    access: "full",
  },
  {
    title: "Lustbound",
    genre: "Dark Fantasy VN",
    description:
      "A dark fantasy visual novel with branching routes and complete gallery scenes.",
    image: 16,
    primary: "video",
    access: "full",
  },
  {
    title: "Arcade After Dark",
    genre: "Arcade Story Game",
    description:
      "A late-night arcade story with secret routes and bonus content.",
    image: 17,
    primary: "video",
    access: "full",
  },
];

const comicsSeeds: ShowcaseSeed[] = [
  {
    title: "Bully's NNN Challenge",
    genre: "Campus Comic",
    description:
      "An illustrated campus rivalry with sharp dialogue and high-DPI panels, presented in the full-screen reader.",
    image: 12,
    primary: "pdf",
    access: "basic",
  },
  {
    title: "Your New Employee - Full Collection",
    genre: "Workplace Comic",
    description:
      "A workplace story with confident characters, crisp panel work and a complete full-color chapter.",
    image: 13,
    primary: "pdf",
    access: "basic",
  },
  {
    title: "Midnight Velvet - Deluxe",
    genre: "Gothic Manga",
    description:
      "A dark gothic serialized manga chapter formatted for the digital reader.",
    image: 14,
    primary: "pdf",
    access: "full",
  },
  {
    title: "Crimson Letters - Reading Room",
    genre: "Campus Comic",
    description:
      "A slow-burn story told through illustrated pages in the reading room.",
    image: 15,
    primary: "pdf",
    access: "full",
  },
  {
    title: "Velvet Pages",
    genre: "Serialized Manga",
    description:
      "A serialized illustrated story with rich color and cinematic panel work.",
    image: 16,
    primary: "pdf",
    access: "full",
  },
  {
    title: "Night Class",
    genre: "Campus Comic",
    description:
      "A campus comic with expressive characters and a complete chapter.",
    image: 17,
    primary: "pdf",
    access: "full",
  },
  {
    title: "Ink & Ash",
    genre: "Dark Fantasy Comic",
    description:
      "A dark fantasy comic with detailed linework and high-resolution panels.",
    image: 0,
    primary: "pdf",
    access: "full",
  },
  {
    title: "Golden Hour",
    genre: "Romance Comic",
    description:
      "A warm, romantic illustrated story with full-color pages.",
    image: 1,
    primary: "pdf",
    access: "full",
  },
  {
    title: "The Long Weekend",
    genre: "Romance Comic",
    description:
      "A complete illustrated chapter with a slow-burn romance.",
    image: 2,
    primary: "pdf",
    access: "full",
  },
  {
    title: "Sugar & Static: Side Stories",
    genre: "Bonus Comic",
    description:
      "Bonus illustrated side stories from the Sugar & Static universe.",
    image: 3,
    primary: "pdf",
    access: "full",
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeSet(
  seed: ShowcaseSeed,
  category: MediaCategory,
  index: number,
): MediaSet {
  const slug = `${category}-${slugify(seed.title)}`;
  const day = 10 - (index % 9);
  return {
    id: `showcase-${slug}`,
    slug,
    title: seed.title,
    description: seed.description,
    thumbnail_path: POSTER_IMAGES[seed.image % POSTER_IMAGES.length],
    primary_type: seed.primary,
    category,
    access_level: seed.access,
    asset_count: 12 + index * 3,
    duration_seconds: seed.primary === "video" ? 720 + index * 45 : null,
    is_trending: index < 3,
    is_new: index < 2,
    published: true,
    sort_order: index,
    created_at: `2026-11-${String(day).padStart(2, "0")}T${String(9 + (index % 12)).padStart(2, "0")}:00:00.000Z`,
    genre: seed.genre,
    tags: ["NSFW sets", "images", "videos"],
    views: 148_000 - index * 6_400,
    aspect_ratio: category === "games" ? "16:9" : "a4",
    is_showcase: true,
  };
}

function build(seeds: ShowcaseSeed[], category: MediaCategory): MediaSet[] {
  return seeds.map((seed, index) => makeSet(seed, category, index));
}

export const SHOWCASE_SETS: MediaSet[] = [
  ...build(animationSeeds, "animation"),
  ...build(artsSeeds, "arts"),
  ...build(gamesSeeds, "games"),
  ...build(comicsSeeds, "comics"),
];

export const SHOWCASE_BY_CATEGORY: Record<MediaCategory, MediaSet[]> = {
  animation: SHOWCASE_SETS.filter((set) => set.category === "animation"),
  arts: SHOWCASE_SETS.filter((set) => set.category === "arts"),
  games: SHOWCASE_SETS.filter((set) => set.category === "games"),
  comics: SHOWCASE_SETS.filter((set) => set.category === "comics"),
};
