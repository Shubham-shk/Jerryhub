import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Generates premium cinematic anime release posters & hero banners.
 * Visual direction:
 * - Multi-panel artwork compositions with diagonal splits & framing.
 * - Detailed anime character silhouettes, glowing eyes, flowing hair, cyber visors.
 * - Deep black & dark charcoal backgrounds with warm amber, deep brown, subtle teal, and neon accents.
 * - Bold poster typography, Japanese kanji glyphs, rating seals, holographic stamps.
 * - Varied aspect ratios for banners & category-themed posters (Animation, Arts, Games, Manga/Comics).
 */

const posterDir = join(process.cwd(), "public", "posters");
const bannerDir = join(process.cwd(), "public", "banners");
mkdirSync(posterDir, { recursive: true });
mkdirSync(bannerDir, { recursive: true });

/** Escapes characters that would otherwise invalidate the SVG XML. */
function escapeXml(value) {
  return String(value)
    .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Palettes tailored to theme: deep blacks, dark charcoals, warm amber/brown, subtle teal, neon magenta/violet
const colorPalettes = [
  // 1: Cyberpunk Neon Velvet (Midnight Velvet)
  { bg1: "#060309", bg2: "#140416", primary: "#ff2d78", secondary: "#c084fc", accent: "#fb7185", amber: "#f59e0b", dark: "#200524", glow: "#ff2d78" },
  // 2: Rainy Cyber City (Neon Temptation)
  { bg1: "#02070e", bg2: "#071c2b", primary: "#06b6d4", secondary: "#3b82f6", accent: "#38e0f5", amber: "#d97706", dark: "#061929", glow: "#06b6d4" },
  // 3: Warm Sensual Crimson (Art of Seduction)
  { bg1: "#0a0304", bg2: "#21070b", primary: "#f43f5e", secondary: "#fb923c", accent: "#fda4af", amber: "#f59e0b", dark: "#360b13", glow: "#f43f5e" },
  // 4: Dark Fantasy Gothic (Crimson Letters)
  { bg1: "#060306", bg2: "#18061a", primary: "#e11d48", secondary: "#a855f7", accent: "#f472b6", amber: "#d97706", dark: "#230628", glow: "#e11d48" },
  // 5: Sunset Synthwave (After Hours)
  { bg1: "#0b050d", bg2: "#22082b", primary: "#ec4899", secondary: "#8b5cf6", accent: "#f43f5e", amber: "#fbbf24", dark: "#330842", glow: "#ec4899" },
  // 6: Candy Glitch (Sugar & Static)
  { bg1: "#080310", bg2: "#190833", primary: "#c084fc", secondary: "#22d3ee", accent: "#f472b6", amber: "#fcd34d", dark: "#27084a", glow: "#c084fc" },
  // 7: Moonlit Silver & Indigo (Moonlit Ritual)
  { bg1: "#030612", bg2: "#0b1536", primary: "#818cf8", secondary: "#38bdf8", accent: "#c7d2fe", amber: "#fbbf24", dark: "#0d1a45", glow: "#818cf8" },
  // 8: Deep Amber & Obsidian (Velvet Frequencies)
  { bg1: "#090502", bg2: "#1f1005", primary: "#f59e0b", secondary: "#d97706", accent: "#fbbf24", amber: "#b45309", dark: "#2f1707", glow: "#f59e0b" },
  // 9: Noir Detective (Room 404)
  { bg1: "#040608", bg2: "#0a131b", primary: "#14b8a6", secondary: "#64748b", accent: "#2dd4bf", amber: "#d97706", dark: "#0d202e", glow: "#14b8a6" },
  // 10: Golden Luxury (Golden Hour)
  { bg1: "#0a0702", bg2: "#241705", primary: "#f59e0b", secondary: "#f97316", accent: "#fde047", amber: "#78350f", dark: "#382207", glow: "#f59e0b" },
  // 11: Retro 2D Arcade (Velvet Arcade)
  { bg1: "#06030c", bg2: "#16072b", primary: "#ec4899", secondary: "#06b6d4", accent: "#a855f7", amber: "#f59e0b", dark: "#220942", glow: "#ec4899" },
  // 12: Visual Novel Matrix (Neon Choices)
  { bg1: "#02090b", bg2: "#05222b", primary: "#10b981", secondary: "#06b6d4", accent: "#34d399", amber: "#fbbf24", dark: "#083340", glow: "#10b981" },
  // 13: Fantasy RPG Quest (Midnight Quest)
  { bg1: "#07030e", bg2: "#1c0938", primary: "#a855f7", secondary: "#6366f1", accent: "#c084fc", amber: "#f59e0b", dark: "#2b0d57", glow: "#a855f7" },
  // 14: Manga Editorial (Velvet Pages)
  { bg1: "#050505", bg2: "#151515", primary: "#f43f5e", secondary: "#e2e8f0", accent: "#fb7185", amber: "#d97706", dark: "#242424", glow: "#f43f5e" },
  // 15: Neon Flora (Static Bloom)
  { bg1: "#040807", bg2: "#08241e", primary: "#2dd4bf", secondary: "#ec4899", accent: "#5eead4", amber: "#f59e0b", dark: "#0b382f", glow: "#2dd4bf" },
  // 16: Lingerie Noir (Lingerie Noir)
  { bg1: "#070204", bg2: "#1c060d", primary: "#fb7185", secondary: "#a855f7", accent: "#fda4af", amber: "#f59e0b", dark: "#2c0915", glow: "#fb7185" },
  // 17: Pixel Chibi Cyber (Pixel Temptation)
  { bg1: "#09030e", bg2: "#210733", primary: "#f472b6", secondary: "#38bdf8", accent: "#fbcfe8", amber: "#fbbf24", dark: "#340c50", glow: "#f472b6" },
  // 18: Campus Mystery (Night Class)
  { bg1: "#04050a", bg2: "#0c1226", primary: "#60a5fa", secondary: "#a78bfa", accent: "#93c5fd", amber: "#d97706", dark: "#131b38", glow: "#60a5fa" },
  // 19: Ink Wash Fantasy (Ink & Ash)
  { bg1: "#050303", bg2: "#1a0b0b", primary: "#ea580c", secondary: "#94a3b8", accent: "#fb923c", amber: "#78350f", dark: "#291212", glow: "#ea580c" },
  // 20: Smoky Velvet (Silk & Smoke)
  { bg1: "#080408", bg2: "#1f0c21", primary: "#d946ef", secondary: "#f43f5e", accent: "#e879f9", amber: "#f59e0b", dark: "#301334", glow: "#d946ef" },
  // 21: UV Blacklight (Neon Skin)
  { bg1: "#02090e", bg2: "#062236", primary: "#00f0ff", secondary: "#a855f7", accent: "#7000ff", amber: "#f59e0b", dark: "#072f4d", glow: "#00f0ff" },
  // 22: Dungeon Crawler (Lustbound)
  { bg1: "#080306", bg2: "#200918", primary: "#f43f5e", secondary: "#d97706", accent: "#fb7185", amber: "#f59e0b", dark: "#330d25", glow: "#f43f5e" },
  // 23: Retro Arcade (Arcade After Dark)
  { bg1: "#05030b", bg2: "#150a2b", primary: "#a855f7", secondary: "#06b6d4", accent: "#f43f5e", amber: "#fbbf24", dark: "#210f44", glow: "#a855f7" },
  // 24: Summer Romance (The Long Weekend)
  { bg1: "#0a0502", bg2: "#221105", primary: "#fb923c", secondary: "#f43f5e", accent: "#fcd34d", amber: "#d97706", dark: "#341907", glow: "#fb923c" },
];

const titles = [
  { en: "MIDNIGHT VELVET", jp: "真夜中のベルベット", sub: "INTERACTIVE COCKHERO · 2K EDITION", tag: "ANIMATION" },
  { en: "NEON TEMPTATION", jp: "電脳の誘惑", sub: "CYBERPUNK SHORT FILM · 60FPS", tag: "ANIMATION" },
  { en: "ART OF SEDUCTION", jp: "官能の美学", sub: "24-PIECE EDITORIAL GALLERY", tag: "ARTS" },
  { en: "CRIMSON LETTERS", jp: "深紅の手紙", sub: "ILLUSTRATED NOVELLA · CHAPTER 1-3", tag: "COMICS" },
  { en: "AFTER HOURS", jp: "放課後の秘め事", sub: "INTERACTIVE EXPERIENCE · ACT I", tag: "ANIMATION" },
  { en: "SUGAR & STATIC", jp: "甘美なノイズ", sub: "ANIME SHORT CUT · GLITCH EDIT", tag: "ANIMATION" },
  { en: "MOONLIT RITUAL", jp: "月光の儀式", sub: "18-PIECE MIDNIGHT GALLERY", tag: "ARTS" },
  { en: "VELVET FREQUENCIES", jp: "調律の快楽", sub: "HAND-TUNED FUNSCRIPT PACK", tag: "ARTS" },
  { en: "ROOM 404", jp: "四〇四号室", sub: "MYSTERY GRAPHIC COMIC", tag: "COMICS" },
  { en: "GOLDEN HOUR", jp: "黄金色の逢瀬", sub: "REMASTERED CINEMATIC 2K", tag: "ANIMATION" },
  { en: "VELVET ARCADE", jp: "電脳遊戯場", sub: "2D INTERACTIVE GAME · VER 1.4", tag: "GAMES" },
  { en: "NEON CHOICES", jp: "ネオンの選択", sub: "VISUAL NOVEL · 6 ROUTES", tag: "GAMES" },
  { en: "MIDNIGHT QUEST", jp: "深夜の冒険録", sub: "2D RPG FANTASY · CHAPTER 1", tag: "GAMES" },
  { en: "VELVET PAGES", jp: "秘密の頁", sub: "MANGA ANTHOLOGY · 48 PAGES", tag: "COMICS" },
  { en: "STATIC BLOOM", jp: "電脳百花", sub: "NEON STILLS COLLECTION", tag: "ARTS" },
  { en: "LINGERIE NOIR", jp: "黒の衣", sub: "EDITORIAL PIN-UP ARCHIVE", tag: "ARTS" },
  { en: "PIXEL TEMPTATION", jp: "ドットの誘惑", sub: "2D ACTION NOVEL · PLAYABLE", tag: "GAMES" },
  { en: "NIGHT CLASS", jp: "深夜の課外授業", sub: "COMIC SERIALIZATION · VOL 2", tag: "COMICS" },
  { en: "INK & ASH", jp: "墨と灰", sub: "DARK FANTASY MANGA · 56P", tag: "COMICS" },
  { en: "SILK & SMOKE", jp: "絹と紫煙", sub: "UNCENSORED DIRECTORS CUT", tag: "ANIMATION" },
  { en: "NEON SKIN", jp: "蛍光の肌", sub: "ULTRAVIOLET ART FILM", tag: "ARTS" },
  { en: "LUSTBOUND", jp: "欲望の迷宮", sub: "DUNGEON CRAWLER RPG · v2.1", tag: "GAMES" },
  { en: "ARCADE AFTER DARK", jp: "深夜のゲームセンター", sub: "MINI-GAME COLLECTION", tag: "GAMES" },
  { en: "THE LONG WEEKEND", jp: "秘密の週末", sub: "FULL COLOR ROMANCE COMIC", tag: "COMICS" },
];

/**
 * Creates SVG anime character silhouette + facial lines + glowing hair & eyes
 */
function animeCharacterPaths(cx, cy, scale, primary, secondary, glow, variant = 0) {
  const flip = variant % 2 === 1 ? -1 : 1;
  return `
    <!-- Anime Character Silhouette & Face Group -->
    <g transform="translate(${cx}, ${cy}) scale(${scale * flip}, ${scale})" opacity="0.95">
      <!-- Glow aura behind hair -->
      <ellipse cx="0" cy="-60" rx="200" ry="240" fill="${primary}" opacity="0.18" filter="url(#glowBlur)"/>
      
      <!-- Back hair volume -->
      <path d="M-140,-40 C-220,60 -190,260 -120,400 C-110,320 -100,240 -80,180 C-40,290 20,380 90,440 C80,310 90,220 130,160 C170,260 210,370 240,430 C200,250 210,60 140,-40 Z" 
            fill="${secondary}" opacity="0.45"/>

      <!-- Body / Collar / Shoulders -->
      <path d="M-130,220 C-110,180 -70,160 -40,150 L-30,130 L30,130 L40,150 C70,160 110,180 130,220 L160,380 L-160,380 Z" 
            fill="#050308" stroke="${primary}" stroke-width="1.5" stroke-opacity="0.3"/>
      
      <!-- Neck -->
      <path d="M-30,100 L-30,145 C-10,155 10,155 30,145 L30,100 Z" fill="#08050c"/>
      <path d="M-18,125 C-5,135 5,135 18,125" fill="none" stroke="${primary}" stroke-width="1" opacity="0.4"/>

      <!-- Jaw / Face contour -->
      <path d="M-68,0 C-72,45 -55,95 0,122 C55,95 72,45 68,0 C65,-50 -65,-50 -68,0 Z" 
            fill="#090610" stroke="${primary}" stroke-width="2" stroke-opacity="0.4"/>

      <!-- Ear details -->
      <path d="M-70,15 C-85,20 -82,50 -66,55" fill="none" stroke="${primary}" stroke-width="1.5" opacity="0.5"/>
      <path d="M68,15 C85,20 82,50 66,55" fill="none" stroke="${primary}" stroke-width="1.5" opacity="0.5"/>

      <!-- Anime Eyes - Stylized dramatic gaze -->
      <!-- Left Eye -->
      <g transform="translate(-34, 25)">
        <path d="M-24,-4 C-10,-14 10,-12 18,-2 C16,4 4,8 -6,6 C-14,5 -20,2 -24,-4 Z" fill="#fff" opacity="0.9"/>
        <!-- Iris -->
        <ellipse cx="-2" cy="-2" rx="9" ry="11" fill="${glow}"/>
        <ellipse cx="-2" cy="-2" rx="6" ry="8" fill="#030005"/>
        <!-- Pupil shine / catchlights -->
        <circle cx="-5" cy="-5" r="3" fill="#fff" opacity="0.95"/>
        <circle cx="2" cy="1" r="1.5" fill="#fff" opacity="0.8"/>
        <!-- Upper Eyelash line -->
        <path d="M-28,-2 C-14,-17 12,-15 22,-2" fill="none" stroke="${primary}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M-24,-1 C-12,-13 8,-12 18,-1" fill="none" stroke="#fff" stroke-width="1.2"/>
        <!-- Double eyelid crease -->
        <path d="M-18,-17 C-8,-23 6,-22 14,-15" fill="none" stroke="${secondary}" stroke-width="1" opacity="0.7"/>
        <!-- Eyelash wing -->
        <path d="M19,-4 L27,-8" stroke="${primary}" stroke-width="2.5" stroke-linecap="round"/>
      </g>

      <!-- Right Eye -->
      <g transform="translate(34, 25)">
        <path d="M24,-4 C10,-14 -10,-12 -18,-2 C-16,4 -4,8 6,6 C14,5 20,2 24,-4 Z" fill="#fff" opacity="0.9"/>
        <!-- Iris -->
        <ellipse cx="2" cy="-2" rx="9" ry="11" fill="${glow}"/>
        <ellipse cx="2" cy="-2" rx="6" ry="8" fill="#030005"/>
        <!-- Pupil shine / catchlights -->
        <circle cx="-1" cy="-5" r="3" fill="#fff" opacity="0.95"/>
        <circle cx="5" cy="1" r="1.5" fill="#fff" opacity="0.8"/>
        <!-- Upper Eyelash line -->
        <path d="M28,-2 C14,-17 -12,-15 -22,-2" fill="none" stroke="${primary}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M24,-1 C12,-13 -8,-12 -18,-1" fill="none" stroke="#fff" stroke-width="1.2"/>
        <!-- Double eyelid crease -->
        <path d="M18,-17 C8,-23 -6,-22 -14,-15" fill="none" stroke="${secondary}" stroke-width="1" opacity="0.7"/>
        <!-- Eyelash wing -->
        <path d="M-19,-4 L-27,-8" stroke="${primary}" stroke-width="2.5" stroke-linecap="round"/>
      </g>

      <!-- Delicate Nose & Lips -->
      <path d="M-2,55 L2,65 L-1,67" fill="none" stroke="${secondary}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      <path d="M-12,88 C-4,86 4,86 12,88" fill="none" stroke="${primary}" stroke-width="2" stroke-linecap="round"/>
      <path d="M-6,95 C-2,98 2,98 6,95" fill="none" stroke="${secondary}" stroke-width="1.2" opacity="0.7"/>

      <!-- Front Bangs / Hair Strands (Anime Framing) -->
      <path d="M-85,-20 C-95,-120 0,-150 85,-20 C95,50 80,110 75,130 C65,70 60,30 50,-10 C40,40 35,90 25,120 C15,60 10,20 0,-20 C-10,30 -20,80 -35,125 C-45,65 -55,20 -65,-10 C-75,40 -80,90 -85,125 Z" 
            fill="#060309" stroke="${primary}" stroke-width="1.5"/>
      <!-- Glowing hair rim lines -->
      <path d="M-80,-20 C-50,-130 50,-130 80,-20" fill="none" stroke="${primary}" stroke-width="2" opacity="0.8"/>
      <path d="M-65,0 C-35,-100 35,-100 65,0" fill="none" stroke="${secondary}" stroke-width="1.2" opacity="0.6"/>
      <path d="M0,-120 L5,20" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.3"/>
      <path d="M-40,-80 L-30,40" fill="none" stroke="${primary}" stroke-width="1" opacity="0.5"/>
      <path d="M40,-80 L30,40" fill="none" stroke="${secondary}" stroke-width="1" opacity="0.5"/>

      <!-- Cybernetic / Magical Headpiece / Visor Accent -->
      ${variant % 3 === 0 ? `
        <path d="M-75,20 L-45,15 L-35,32 L-65,37 Z" fill="${primary}" opacity="0.7"/>
        <path d="M75,20 L45,15 L35,32 L65,37 Z" fill="${secondary}" opacity="0.7"/>
        <line x1="-75" y1="20" x2="75" y2="20" stroke="${primary}" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/>
        <circle cx="-55" cy="26" r="3" fill="#fff"/>
        <circle cx="55" cy="26" r="3" fill="#fff"/>
      ` : ""}
    </g>
  `;
}

/**
 * Creates multi-panel diagonal composition for a 900x1350 poster
 */
function createPosterSvg(index) {
  const p = colorPalettes[index % colorPalettes.length];
  const t = titles[index % titles.length];
  const isMultiPanel = index % 2 === 0;
  const isDiagonalSlash = index % 3 === 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1350" viewBox="0 0 900 1350" role="img" aria-label="${escapeXml(t.en)} - ${escapeXml(t.jp)}">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${p.bg2}"/>
      <stop offset="50%" stop-color="${p.bg1}"/>
      <stop offset="100%" stop-color="#020104"/>
    </linearGradient>

    <!-- Radial Glows -->
    <radialGradient id="glowTop" cx="0.8" cy="0.15" r="0.6">
      <stop offset="0%" stop-color="${p.primary}" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="${p.secondary}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowCenter" cx="0.3" cy="0.5" r="0.7">
      <stop offset="0%" stop-color="${p.secondary}" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="${p.primary}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBottom" cx="0.5" cy="0.9" r="0.5">
      <stop offset="0%" stop-color="${p.amber}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>

    <!-- Diagonal Beam -->
    <linearGradient id="slashBeam" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.primary}" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="${p.secondary}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </linearGradient>

    <!-- Halftone Pattern -->
    <pattern id="dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="${p.primary}" opacity="0.18"/>
    </pattern>

    <!-- Diagonal Strip Pattern -->
    <pattern id="stripes" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="20" stroke="${p.secondary}" stroke-width="2" opacity="0.12"/>
    </pattern>

    <!-- Cyber Grid -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${p.primary}" stroke-width="0.8" opacity="0.08"/>
    </pattern>

    <!-- Bottom Vignette -->
    <linearGradient id="bottomVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020104" stop-opacity="0"/>
      <stop offset="45%" stop-color="#020104" stop-opacity="0.4"/>
      <stop offset="80%" stop-color="#020104" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#020104" stop-opacity="0.98"/>
    </linearGradient>

    <filter id="glowBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="35"/>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="8"/>
    </filter>

    <!-- Diagonal Clip Path for Multi-Panel Composition -->
    <clipPath id="diagonalPanel1">
      <polygon points="0,0 900,0 900,680 0,940"/>
    </clipPath>
    <clipPath id="diagonalPanel2">
      <polygon points="0,960 900,700 900,1350 0,1350"/>
    </clipPath>
    <clipPath id="cornerSlice">
      <polygon points="520,0 900,0 900,480 680,480"/>
    </clipPath>
  </defs>

  <!-- Deep Base Background -->
  <rect width="900" height="1350" fill="url(#bgGrad)"/>
  <rect width="900" height="1350" fill="url(#dots)"/>
  <rect width="900" height="1350" fill="url(#grid)"/>

  <!-- Atmospheric Lighting -->
  <rect width="900" height="1350" fill="url(#glowTop)"/>
  <rect width="900" height="1350" fill="url(#glowCenter)"/>
  <rect width="900" height="1350" fill="url(#glowBottom)"/>

  <!-- Geometric Sci-fi / Fantasy Background Circles & Glyphs -->
  <g transform="translate(620, 420)" stroke="${p.primary}" fill="none" opacity="0.25">
    <circle r="320" stroke-width="1.2" stroke-dasharray="12,6"/>
    <circle r="260" stroke-width="1"/>
    <circle r="200" stroke-width="2" stroke-dasharray="4,8"/>
    <circle r="120" stroke-width="1"/>
    <polygon points="0,-180 156,90 -156,90" stroke-width="1.2" opacity="0.5"/>
    <polygon points="0,180 156,-90 -156,-90" stroke-width="1.2" opacity="0.5"/>
  </g>

  <!-- Dynamic Diagonal Light Beams -->
  <path d="M-100,1350 L520,-50 L640,-50 L20,1350 Z" fill="url(#slashBeam)" opacity="0.45"/>
  <path d="M280,1350 L820,-50 L890,-50 L350,1350 Z" fill="url(#slashBeam)" opacity="0.25"/>

  <!-- Main Anime Character Group -->
  ${animeCharacterPaths(450, 480, 1.45, p.primary, p.secondary, p.accent, index)}

  ${isMultiPanel ? `
    <!-- Multi-panel Diagonal Division (As in Reference Image) -->
    <!-- Diagonal Divider Bar with glowing stroke -->
    <polygon points="-50,950 950,650 950,670 -50,970" fill="${p.primary}" opacity="0.9"/>
    <polygon points="-50,970 950,670 950,674 -50,974" fill="#ffffff" opacity="0.8"/>
    <polygon points="-50,940 950,640 950,643 -50,943" fill="${p.secondary}" opacity="0.6"/>

    <!-- Inset Character Close-up / Secondary Visual in upper right -->
    <g opacity="0.85">
      <polygon points="560,40 860,40 860,340 500,340" fill="#040207" stroke="${p.primary}" stroke-width="1.5"/>
      <g transform="translate(680, 190) scale(0.65)">
        <!-- Eye close-up panel -->
        <ellipse cx="0" cy="0" rx="90" ry="60" fill="${p.bg2}"/>
        <ellipse cx="0" cy="0" rx="36" ry="46" fill="${p.accent}"/>
        <ellipse cx="0" cy="0" rx="20" ry="28" fill="#05010a"/>
        <circle cx="-10" cy="-12" r="10" fill="#fff"/>
        <circle cx="10" cy="8" r="4" fill="#fff"/>
        <path d="M-75,0 C-30,-35 30,-35 75,0" stroke="${p.primary}" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M-60,0 C-25,-25 25,-25 60,0" stroke="#fff" stroke-width="2" fill="none"/>
      </g>
      <text x="580" y="70" font-family="'Inter', sans-serif" font-size="10" font-weight="700" letter-spacing="3" fill="${p.accent}">CLOSE UP // 01</text>
    </g>
  ` : isDiagonalSlash ? `
    <!-- Diagonal Slash Composition with Neon Hazard Accent -->
    <g transform="translate(60, 260) rotate(-18)" opacity="0.6">
      <rect x="0" y="0" width="380" height="26" fill="#090510" stroke="${p.primary}" stroke-width="1"/>
      <rect x="0" y="0" width="380" height="26" fill="url(#stripes)"/>
      <text x="15" y="17" font-family="'Inter', sans-serif" font-size="10" font-weight="800" letter-spacing="3" fill="#fff">WARNING // CLASSIFIED ARCHIVE</text>
    </g>
  ` : ""}

  <!-- Manga Speed Lines / Cyber Streaks -->
  <g stroke="${p.primary}" opacity="0.25" stroke-width="1">
    <line x1="40" y1="120" x2="240" y2="120"/>
    <line x1="40" y1="135" x2="160" y2="135"/>
    <line x1="40" y1="150" x2="280" y2="150"/>
    <line x1="720" y1="1100" x2="860" y2="1100"/>
    <line x1="760" y1="1115" x2="860" y2="1115"/>
  </g>

  <!-- Large Japanese Kanji Watermark (Anime Release Style) -->
  <text x="830" y="580" font-family="'Sora', sans-serif" font-size="96" font-weight="900" 
        fill="${p.primary}" opacity="0.15" text-anchor="end" writing-mode="vertical-rl" letter-spacing="18">${t.jp}</text>

  <!-- Dark Edge & Bottom Vignette for Poster Legibility -->
  <rect width="900" height="1350" fill="url(#bottomVignette)"/>

  <!-- Top Header Badges -->
  <g transform="translate(48, 64)">
    <!-- Brand Tag -->
    <rect x="0" y="0" width="136" height="28" rx="6" fill="#090510" stroke="${p.primary}" stroke-width="1.2" opacity="0.85"/>
    <circle cx="16" cy="14" r="4" fill="${p.primary}"/>
    <text x="28" y="18" font-family="'Inter', sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#ffffff">JERRYHUB</text>

    <!-- Category Pill -->
    <rect x="146" y="0" width="112" height="28" rx="6" fill="${p.dark}" stroke="${p.secondary}" stroke-width="1" opacity="0.75"/>
    <text x="202" y="18" font-family="'Inter', sans-serif" font-size="10" font-weight="800" letter-spacing="2" fill="${p.accent}" text-anchor="middle">${t.tag}</text>
  </g>

  <!-- 18+ Adults Only Cinematic Stamp (Top Right) -->
  <g transform="translate(852, 64)" text-anchor="end">
    <rect x="-70" y="0" width="70" height="28" rx="6" fill="#140205" stroke="#f43f5e" stroke-width="1.2" opacity="0.9"/>
    <text x="-35" y="18" font-family="'Inter', sans-serif" font-size="11" font-weight="800" letter-spacing="2" fill="#f43f5e" text-anchor="middle">18+ R</text>
  </g>

  <!-- Futuristic Barcode & Archive Stamp in Bottom-Right Corner -->
  <g transform="translate(852, 1260)" text-anchor="end" opacity="0.75">
    <g fill="${p.accent}">
      <rect x="-140" y="-30" width="4" height="24"/>
      <rect x="-132" y="-30" width="8" height="24"/>
      <rect x="-120" y="-30" width="2" height="24"/>
      <rect x="-114" y="-30" width="6" height="24"/>
      <rect x="-104" y="-30" width="10" height="24"/>
      <rect x="-90" y="-30" width="4" height="24"/>
      <rect x="-82" y="-30" width="12" height="24"/>
      <rect x="-66" y="-30" width="6" height="24"/>
      <rect x="-56" y="-30" width="3" height="24"/>
      <rect x="-48" y="-30" width="8" height="24"/>
      <rect x="-36" y="-30" width="4" height="24"/>
      <rect x="-28" y="-30" width="14" height="24"/>
      <rect x="-10" y="-30" width="4" height="24"/>
    </g>
    <text x="0" y="8" font-family="'Inter', sans-serif" font-size="8" letter-spacing="2" fill="rgba(255,255,255,0.5)">SET #${String(index + 1).padStart(3, "0")} · OFFICIAL RELEASE</text>
  </g>

  <!-- Holographic Border Edge Highlight -->
  <rect x="2" y="2" width="896" height="1346" rx="14" fill="none" stroke="${p.primary}" stroke-width="1.5" stroke-opacity="0.35"/>
</svg>`;
}

for (let i = 0; i < 24; i++) {
  writeFileSync(
    join(posterDir, `portrait-${String(i + 1).padStart(2, "0")}.svg`),
    createPosterSvg(i),
    "utf8"
  );
  // Also provide poster-01 to poster-10 for legacy links
  if (i < 10) {
    writeFileSync(
      join(posterDir, `poster-${String(i + 1).padStart(2, "0")}.svg`),
      createPosterSvg(i),
      "utf8"
    );
  }
}

/**
 * Generates cinematic hero widescreen banners with varied aspect ratios:
 * 1: 21:9 Ultra-widescreen (1920x820) - Cyberpunk Neon Velvet
 * 2: 16:9 Standard Cinema (1920x1080) - Rainy Neon Temptation
 * 3: 3:2 Game Storefront (1800x1200) - Velvet Arcade 2D Showcase
 * 4: 4:3 Manga Reading Room (1600x1200) - Crimson Letters Gothic Story
 * 5: 16:9 Action Feature (1920x1080) - Midnight Quest Fantasy
 * 6: 21:9 Panoramic (1920x820) - Golden Hour Remastered
 */
const bannerConfigs = [
  { w: 1920, h: 820, ratio: "21x9", palette: colorPalettes[0], title: titles[0], subTitle: "THE PREMIER INTERACTIVE ANIME EXPERIENCE" },
  { w: 1920, h: 1080, ratio: "16:9", palette: colorPalettes[1], title: titles[1], subTitle: "RAIN-SOAKED CYBERPUNK MASTERPIECE IN 2K" },
  { w: 1800, h: 1200, ratio: "3:2", palette: colorPalettes[10], title: titles[10], subTitle: "RETRO-FUTURISTIC 2D GAME · ALL ROUTES UNLOCKED" },
  { w: 1600, h: 1200, ratio: "4:3", palette: colorPalettes[3], title: titles[3], subTitle: "DARK FANTASY ILLUSTRATED MANGA & NOVELLA" },
  { w: 1920, h: 1080, ratio: "16:9", palette: colorPalettes[12], title: titles[12], subTitle: "ANIME RPG DUNGEON FANTASY · CHAPTER ONE" },
  { w: 1920, h: 820, ratio: "21x9", palette: colorPalettes[9], title: titles[9], subTitle: "WARM LIGHT, INTENSE PASSION · 2K REMASTER" },
];

bannerConfigs.forEach((cfg, index) => {
  const p = cfg.palette;
  const t = cfg.title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cfg.w}" height="${cfg.h}" viewBox="0 0 ${cfg.w} ${cfg.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeXml(t.en)} - ${escapeXml(t.jp)}">
  <defs>
    <linearGradient id="bGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bg2}"/>
      <stop offset="45%" stop-color="${p.bg1}"/>
      <stop offset="100%" stop-color="#020104"/>
    </linearGradient>
    <radialGradient id="bAura1" cx="0.75" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="${p.primary}" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="${p.secondary}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bAura2" cx="0.2" cy="0.8" r="0.5">
      <stop offset="0%" stop-color="${p.amber}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>

    <!-- Diagonal Hero Beam -->
    <linearGradient id="bBeam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${p.primary}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </linearGradient>

    <!-- Halftone grid -->
    <pattern id="bDots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.5" fill="${p.primary}" opacity="0.14"/>
    </pattern>
    <pattern id="bGrid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${p.secondary}" stroke-width="0.7" opacity="0.08"/>
    </pattern>

    <linearGradient id="bVignette" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#030206" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#030206" stop-opacity="0.65"/>
      <stop offset="80%" stop-color="#030206" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#030206" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="bBottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#030206" stop-opacity="0"/>
      <stop offset="70%" stop-color="#030206" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#030206" stop-opacity="0.95"/>
    </linearGradient>

    <filter id="glowBlur">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
  </defs>

  <rect width="${cfg.w}" height="${cfg.h}" fill="url(#bGrad)"/>
  <rect width="${cfg.w}" height="${cfg.h}" fill="url(#bDots)"/>
  <rect width="${cfg.w}" height="${cfg.h}" fill="url(#bGrid)"/>
  <rect width="${cfg.w}" height="${cfg.h}" fill="url(#bAura1)"/>
  <rect width="${cfg.w}" height="${cfg.h}" fill="url(#bAura2)"/>

  <!-- Dramatic Anime City / Background Silhouette -->
  <g opacity="0.3" fill="#040207">
    <rect x="${cfg.w * 0.4}" y="${cfg.h * 0.5}" width="120" height="${cfg.h * 0.5}"/>
    <rect x="${cfg.w * 0.48}" y="${cfg.h * 0.42}" width="90" height="${cfg.h * 0.58}"/>
    <rect x="${cfg.w * 0.55}" y="${cfg.h * 0.55}" width="150" height="${cfg.h * 0.45}"/>
    <rect x="${cfg.w * 0.65}" y="${cfg.h * 0.38}" width="140" height="${cfg.h * 0.62}"/>
    <rect x="${cfg.w * 0.74}" y="${cfg.h * 0.48}" width="110" height="${cfg.h * 0.52}"/>
    <rect x="${cfg.w * 0.82}" y="${cfg.h * 0.34}" width="160" height="${cfg.h * 0.66}"/>
  </g>

  <!-- Diagonal Cyber Beams -->
  <path d="M${cfg.w * 0.25},${cfg.h} L${cfg.w * 0.65},-100 L${cfg.w * 0.78},-100 L${cfg.w * 0.38},${cfg.h} Z" fill="url(#bBeam)" opacity="0.4"/>
  <path d="M${cfg.w * 0.5},${cfg.h} L${cfg.w * 0.85},-100 L${cfg.w * 0.92},-100 L${cfg.w * 0.57},${cfg.h} Z" fill="url(#bBeam)" opacity="0.2"/>

  <!-- Giant Japanese Typography in Background -->
  <text x="${cfg.w * 0.85}" y="${cfg.h * 0.6}" font-family="'Sora', sans-serif" font-size="${cfg.h * 0.24}" font-weight="900" 
        fill="${p.primary}" opacity="0.12" text-anchor="middle">${t.jp}</text>

  <!-- Multi-panel diagonal framing accents -->
  <polygon points="${cfg.w * 0.45},0 ${cfg.w * 0.52},0 ${cfg.w * 0.25},${cfg.h} ${cfg.w * 0.18},${cfg.h}" fill="${p.primary}" opacity="0.35"/>
  <polygon points="${cfg.w * 0.52},0 ${cfg.w * 0.53},0 ${cfg.w * 0.26},${cfg.h} ${cfg.w * 0.25},${cfg.h}" fill="#fff" opacity="0.6"/>

  <!-- Featured Character Render on Right Side -->
  ${animeCharacterPaths(cfg.w * 0.72, cfg.h * 0.48, cfg.h * 0.0016, p.primary, p.secondary, p.accent, index + 1)}

  <!-- Left Side Vignette to ensure text readability -->
  <rect width="${cfg.w}" height="${cfg.h}" fill="url(#bVignette)"/>
  <rect width="${cfg.w}" height="${cfg.h}" fill="url(#bBottomFade)"/>
</svg>`;

  writeFileSync(join(bannerDir, `banner-${String(index + 1).padStart(2, "0")}.svg`), svg, "utf8");
});

console.log("Successfully generated 24 anime release posters + 6 cinematic banners with diagonal compositions!");
