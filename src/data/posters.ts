import type { MediaCategory } from "../lib/types";

/**
 * Single source of truth for the supplied poster artwork.
 */
export const POSTER_IMAGES = [
  "https://i.ibb.co/cX2Pr3GR/image-8.png",
  "https://i.ibb.co/7d4c44Kf/image-9.png",
  "https://i.ibb.co/cnyc1qH/image-10.png",
  "https://i.ibb.co/20bGT8tK/image-11.png",
  "https://i.ibb.co/3mmf4Pff/image-12.png",
  "https://i.ibb.co/rD9WX9p/image-13.png",
  "https://i.ibb.co/60jgGTfr/image-14.png",
  "https://i.ibb.co/YJsy1K1/image-15.png",
  "https://i.ibb.co/WWKvrL9D/poster1-1.png",
  "https://i.ibb.co/bMv4tfPt/poster3.png",
  "https://i.ibb.co/wF3KZVN3/POSTER4.png",
  "https://i.ibb.co/jsqDskw/poster6.png",
  "https://i.ibb.co/xK8kgmkS/POSTER8.png",
  "https://i.ibb.co/C3Rk5WsC/poster9.png",
  "https://i.ibb.co/4nDY3vQj/poster12.png",
  "https://i.ibb.co/CpwzhzgM/poster15.png",
  "https://i.ibb.co/8nMHvJzf/poster20.png",
  "https://i.ibb.co/qLG9KD4n/poster21.png",
] as const;

/**
 * Hashtags shown on every set across the catalogue and the hero slideshow.
 */
export const UNIVERSAL_SET_TAGS = ["NSFW sets", "images", "videos"];

export interface HubPoster {
  id: string;
  file: string;
  title: string;
  slug: string;
  category: MediaCategory;
  genre: string;
  blurb: string;
  tags: string[];
}

export const HUB_POSTERS: HubPoster[] = [
  {
    id: "hub-p01",
    file: POSTER_IMAGES[0],
    title: "Got pregnant - Full Set",
    slug: "got-pregnant-full-set",
    category: "animation",
    genre: "Drama Animation",
    blurb:
      "A slow-burn story with polished 2K art, deliberate pacing and a fully synchronized interactive experience.",
    tags: ["Drama", "2KAnimation", "Interactive", "Story"],
  },
  {
    id: "hub-p02",
    file: POSTER_IMAGES[1],
    title: "Professor Secret OF Account",
    slug: "professor-secret-of-account",
    category: "animation",
    genre: "Drama Animation",
    blurb:
      "A professor with a secret second life, a private account and one student who finds it. Polished 2K art with an immersive edit.",
    tags: ["FamilyDrama", "2KAnimation", "Story", "Exclusive"],
  },
  {
    id: "hub-p03",
    file: POSTER_IMAGES[2],
    title: "Goth friend got some problems",
    slug: "goth-friend-got-some-problems",
    category: "arts",
    genre: "Moody Editorial",
    blurb:
      "A moody aesthetic gallery with warm cinematic grading, exclusive stills and a high-DPI art-book finish.",
    tags: ["Goth", "ArtGallery", "HighDPI", "Editorial"],
  },
  {
    id: "hub-p04",
    file: POSTER_IMAGES[3],
    title: "NTR gone wrong - full collection",
    slug: "ntr-gone-wrong-full-collection",
    category: "animation",
    genre: "Drama Animation",
    blurb:
      "A tense relationship drama with sharp direction, expressive animation and a tightly timed interactive script.",
    tags: ["Drama", "NTR", "2KAnimation", "Interactive"],
  },
  {
    id: "hub-p05",
    file: POSTER_IMAGES[4],
    title: "Momo Ayase pack - 1/2",
    slug: "momo-ayase-pack-1-2",
    category: "animation",
    genre: "Character Animation",
    blurb:
      "A playful animated release with bright color, expressive motion and a 2K master built for late nights.",
    tags: ["MomoAyase", "Animation", "2K", "Playful"],
  },
  {
    id: "hub-p06",
    file: POSTER_IMAGES[5],
    title: "Bully's NNN Challenge",
    slug: "bullys-nnn-challenge",
    category: "comics",
    genre: "Campus Comic",
    blurb:
      "An illustrated campus rivalry with sharp dialogue and high-DPI panels, presented in the full-screen reader.",
    tags: ["Campus", "Bully", "Comic", "HighDPI", "Drama"],
  },
  {
    id: "hub-p08",
    file: POSTER_IMAGES[6],
    title: "(50+ img ) Mikasa - Part 1 (exclusive)",
    slug: "mikasa-part-1-exclusive",
    category: "arts",
    genre: "Character Art Gallery",
    blurb:
      "A high-resolution character gallery with dramatic lighting, detailed linework and exclusive bonus frames.",
    tags: ["CharacterArt", "Mikasa", "Gallery", "HighRes", "Cosplay"],
  },
  {
    id: "hub-p09",
    file: POSTER_IMAGES[7],
    title: "Your New Employee - full collection",
    slug: "your-new-employee-full-collection",
    category: "comics",
    genre: "Workplace Comic",
    blurb:
      "A workplace story with confident characters, crisp panel work and a complete full-color chapter.",
    tags: ["Workplace", "Comic", "FullColor", "Campus", "Complete"],
  },
  {
    id: "hub-p10",
    file: POSTER_IMAGES[8],
    title: "Bath with Stepsis",
    slug: "bath-with-stepsis",
    category: "arts",
    genre: "Bath Editorial",
    blurb:
      "A soft-lit gallery with reflective water, warm skin tones and a polished editorial finish.",
    tags: ["StepSis", "Bath", "ArtGallery", "SoftLight", "HighDPI"],
  },
  {
    id: "hub-p11",
    file: POSTER_IMAGES[9],
    title: "Aunt Marry",
    slug: "aunt-marry",
    category: "animation",
    genre: "Family Drama Animation",
    blurb:
      "A warm family drama with a mature edge, hand-finished 2K frames and a patient cinematic pace.",
    tags: ["Aunt", "FamilyDrama", "2KAnimation", "Mature", "Story"],
  },
  {
    id: "hub-p12",
    file: POSTER_IMAGES[10],
    title: "Tomboy Friend's Night Visit",
    slug: "tomboy-friends-night-visit",
    category: "games",
    genre: "Choice Adventure / VN",
    blurb:
      "A special-edition visual novel where every route opens a new scene. Multiple endings, one very long night.",
    tags: ["VisualNovel", "Tomboy", "MultipleEndings", "SpecialEdition", "Playable"],
  },
  {
    id: "hub-p13",
    file: POSTER_IMAGES[11],
    title: "Stepsis thinks she is chubby",
    slug: "stepsis-thinks-she-is-chubby",
    category: "games",
    genre: "Step-Sibling Game",
    blurb:
      "A playful game with expressive sprites, unlockable gallery scenes and multiple endings.",
    tags: ["StepSis", "2DGame", "Unlockables", "MultipleEndings", "Playable"],
  },
  {
    id: "hub-p14",
    file: POSTER_IMAGES[12],
    title: "Sylphiette Greyrat",
    slug: "sylphiette-greyrat",
    category: "games",
    genre: "Fantasy Character Game",
    blurb:
      "A fantasy character route with hand-drawn scenes, companion dialogue and secret unlockable encounters.",
    tags: ["Fantasy", "Sylphiette", "2DRPG", "Companion", "SecretScenes"],
  },
  {
    id: "hub-p15",
    file: POSTER_IMAGES[13],
    title: "Midnight Velvet - Deluxe",
    slug: "midnight-velvet-deluxe",
    category: "comics",
    genre: "Workplace Comic",
    blurb:
      "A dark gothic serialized manga chapter formatted for the digital reader.",
    tags: ["Manga", "Gothic", "Cyberpunk", "Story"],
  },
  {
    id: "hub-p16",
    file: POSTER_IMAGES[14],
    title: "Neon Temptation - 2K Cut",
    slug: "neon-temptation-2k-cut",
    category: "animation",
    genre: "2K Short Film",
    blurb:
      "A rain-soaked 2K animation with rich neon reflections and smooth pacing.",
    tags: ["2KAnimation", "Cyberpunk", "Rain", "ShortFilm"],
  },
  {
    id: "hub-p17",
    file: POSTER_IMAGES[15],
    title: "The Art of Seduction - Master",
    slug: "the-art-of-seduction-master",
    category: "arts",
    genre: "Editorial Pin-Up",
    blurb:
      "An exclusive illustrated art set with editorial lighting and velvet textures.",
    tags: ["ArtGallery", "HighRes", "Velvet", "Illustration"],
  },
  {
    id: "hub-p18",
    file: POSTER_IMAGES[16],
    title: "Cyber Arcade Romance",
    slug: "cyber-arcade-romance",
    category: "games",
    genre: "Choice Adventure / VN",
    blurb:
      "A neon arcade visual novel with multiple routes and secret bonus encounters.",
    tags: ["VisualNovel", "Arcade", "MultipleEndings", "Playable"],
  },
  {
    id: "hub-p19",
    file: POSTER_IMAGES[17],
    title: "Crimson Letters - Reading Room",
    slug: "crimson-letters-reading-room",
    category: "comics",
    genre: "Campus Comic",
    blurb:
      "A slow-burn story told through illustrated pages in the reading room.",
    tags: ["Campus", "Manga", "DigitalManga", "Complete"],
  },
];

export const HUB_POSTER_FILES = HUB_POSTERS.map((item) => item.file);
