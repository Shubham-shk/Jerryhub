import type { MediaCategory } from "../lib/types";

/**
 * The single source of truth for the supplied hub poster artwork.
 *
 * Titles follow the names printed on the posters. Files live in
 * `public/posters/hub/opt` as compressed 640px JPEGs so the cards and the
 * homepage poster wall stay fast while still looking crisp at 2x.
 */
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

const poster = (n: number) => `/posters/hub/opt/p${String(n).padStart(2, "0")}.jpg`;

export const HUB_POSTERS: HubPoster[] = [
  {
    id: "hub-p01",
    file: poster(1),
    title: "Stepmom Got Pregnant",
    slug: "stepmom-got-pregnant",
    category: "animation",
    genre: "Family Drama Animation",
    blurb:
      "A slow-burn stepmom story with polished 2K art, deliberate pacing and a fully synchronized funscript.",
    tags: ["StepMom", "FamilyDrama", "2KAnimation", "Funscript", "Uncensored"],
  },
  {
    id: "hub-p02",
    file: poster(2),
    title: "Stepmom and Daughter",
    slug: "stepmom-and-daughter",
    category: "animation",
    genre: "Family Drama Animation",
    blurb:
      "Two generations, one impossible secret. A cinematic 2K animation with soft lighting and an immersive edit.",
    tags: ["StepMom", "Daughter", "FamilyDrama", "2KAnimation", "Story"],
  },
  {
    id: "hub-p03",
    file: poster(3),
    title: "Sophia Vacation",
    slug: "sophia-vacation",
    category: "arts",
    genre: "Vacation Editorial",
    blurb:
      "A sunlit vacation gallery with warm cinematic grading, exclusive stills and a high-DPI art-book finish.",
    tags: ["Vacation", "ArtGallery", "HighDPI", "Editorial", "Summer"],
  },
  {
    id: "hub-p04",
    file: poster(4),
    title: "NTR Gone Wrong",
    slug: "ntr-gone-wrong",
    category: "animation",
    genre: "Drama Animation",
    blurb:
      "A tense relationship drama with sharp direction, expressive animation and a tightly timed interactive script.",
    tags: ["Drama", "NTR", "2KAnimation", "Interactive", "Uncensored"],
  },
  {
    id: "hub-p05",
    file: poster(5),
    title: "Cassie Step-Sis",
    slug: "cassie-step-sis",
    category: "animation",
    genre: "Step-Sibling Animation",
    blurb:
      "A playful step-sister story with bright color, expressive motion and a 2K master built for late nights.",
    tags: ["StepSis", "Animation", "2K", "Playful", "Uncensored"],
  },
  {
    id: "hub-p06",
    file: poster(6),
    title: "Arrogant Bully",
    slug: "arrogant-bully",
    category: "comics",
    genre: "Campus Comic",
    blurb:
      "An illustrated campus rivalry with sharp dialogue and high-DPI panels, presented in the full-screen reader.",
    tags: ["Campus", "Bully", "Comic", "HighDPI", "Drama"],
  },
  {
    id: "hub-p08",
    file: poster(8),
    title: "Mikasa",
    slug: "mikasa",
    category: "arts",
    genre: "Character Art Gallery",
    blurb:
      "A high-resolution character gallery with dramatic lighting, detailed linework and exclusive bonus frames.",
    tags: ["CharacterArt", "Mikasa", "Gallery", "HighRes", "Cosplay"],
  },
  {
    id: "hub-p09",
    file: poster(9),
    title: "Student President",
    slug: "student-president",
    category: "comics",
    genre: "Campus Comic",
    blurb:
      "A student council story with confident characters, crisp panel work and a complete full-color chapter.",
    tags: ["StudentCouncil", "Comic", "FullColor", "Campus", "Complete"],
  },
  {
    id: "hub-p10",
    file: poster(10),
    title: "Bath with Step-Sis",
    slug: "bath-with-step-sis",
    category: "arts",
    genre: "Bath Editorial",
    blurb:
      "A soft-lit step-sister gallery with reflective water, warm skin tones and a polished editorial finish.",
    tags: ["StepSis", "Bath", "ArtGallery", "SoftLight", "HighDPI"],
  },
  {
    id: "hub-p11",
    file: poster(11),
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
    file: poster(12),
    title: "Stepmother Friends Special Version",
    slug: "stepmother-friends-special-version",
    category: "games",
    genre: "Choice Adventure / VN",
    blurb:
      "A special-edition visual novel where every route opens a new scene. Multiple endings, one very long night.",
    tags: ["VisualNovel", "StepMom", "MultipleEndings", "SpecialEdition", "Playable"],
  },
  {
    id: "hub-p13",
    file: poster(13),
    title: "Bratty Step-Sis",
    slug: "bratty-step-sis",
    category: "games",
    genre: "Step-Sibling Game",
    blurb:
      "A playful step-sister game with expressive sprites, unlockable gallery scenes and multiple endings.",
    tags: ["StepSis", "2DGame", "Unlockables", "MultipleEndings", "Playable"],
  },
  {
    id: "hub-p14",
    file: poster(14),
    title: "Sylphiette Greyrat",
    slug: "sylphiette-greyrat",
    category: "games",
    genre: "Fantasy Character Game",
    blurb:
      "A fantasy character route with hand-drawn scenes, companion dialogue and secret unlockable encounters.",
    tags: ["Fantasy", "Sylphiette", "2DRPG", "Companion", "SecretScenes"],
  },
];

export const HUB_POSTER_FILES = HUB_POSTERS.map((item) => item.file);
