import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "public", "posters");
mkdirSync(outDir, { recursive: true });

const palettes = [
  { a: "#2a0a1e", b: "#12020b", c: "#ff2d78", d: "#8b5cf6", mark: "01" },
  { a: "#041c24", b: "#02090f", c: "#22d3ee", d: "#6366f1", mark: "02" },
  { a: "#240a08", b: "#100303", c: "#fb7185", d: "#f59e0b", mark: "03" },
  { a: "#1c0a2e", b: "#09020f", c: "#a855f7", d: "#ec4899", mark: "04" },
  { a: "#03201a", b: "#010b09", c: "#34d399", d: "#06b6d4", mark: "05" },
  { a: "#241505", b: "#0d0701", c: "#fbbf24", d: "#f43f5e", mark: "06" },
  { a: "#0b1030", b: "#030512", c: "#818cf8", d: "#22d3ee", mark: "07" },
  { a: "#280512", b: "#0d0206", c: "#f43f5e", d: "#a855f7", mark: "08" },
  { a: "#041f1c", b: "#010a09", c: "#2dd4bf", d: "#3b82f6", mark: "09" },
  { a: "#2a1018", b: "#120509", c: "#fb923c", d: "#f472b6", mark: "10" },
];

const variants = [
  // blurred orbs + arc
  (p, i) => `
    <circle cx="${180 + i * 40}" cy="520" r="330" fill="url(#orbA)" opacity=".9"/>
    <circle cx="980" cy="120" r="250" fill="url(#orbB)" opacity=".75"/>
    <path d="M760 700 C 760 380, 1030 250, 1260 250" fill="none" stroke="${p.c}" stroke-width="2" opacity=".45"/>
    <path d="M820 720 C 820 430, 1060 330, 1270 330" fill="none" stroke="#fff" stroke-width="1" opacity=".16"/>
    <circle cx="950" cy="330" r="150" fill="none" stroke="${p.d}" stroke-width="1.5" opacity=".35"/>`,
  // diagonal light beams
  (p, i) => `
    <path d="M-100 700 L 520 -80 L 760 -80 L 140 700 Z" fill="url(#beam)" opacity=".55"/>
    <circle cx="${920 - i * 20}" cy="200" r="220" fill="url(#orbB)"/>
    <g opacity=".35" stroke="#fff">
      <path d="M0 540 L1200 280" stroke-width="1"/>
      <path d="M0 600 L1200 340" stroke-width="1"/>
      <path d="M0 660 L1200 400" stroke-width="1"/>
    </g>
    <circle cx="250" cy="250" r="110" fill="none" stroke="${p.c}" stroke-width="1.5" opacity=".5"/>`,
  // concentric rings
  (p, i) => `
    <g transform="translate(940 330)" fill="none" stroke="${p.c}">
      <circle r="260" opacity=".18" stroke-width="1"/>
      <circle r="205" opacity=".25" stroke-width="1"/>
      <circle r="150" opacity=".35" stroke-width="1.5"/>
      <circle r="95" opacity=".55" stroke-width="2"/>
      <circle r="40" fill="${p.c}" opacity=".18" stroke="none"/>
    </g>
    <circle cx="220" cy="540" r="300" fill="url(#orbA)" opacity=".8"/>
    <path d="M0 120 L 1200 120" stroke="#fff" opacity=".08"/>`,
  // horizon
  (p, i) => `
    <circle cx="600" cy="420" r="210" fill="url(#orbB)" opacity=".85"/>
    <path d="M0 420 H1200" stroke="${p.c}" opacity=".35"/>
    <g stroke="#fff" opacity=".1">
      <path d="M0 450 H1200"/><path d="M0 490 H1200"/><path d="M0 540 H1200"/><path d="M0 600 H1200"/>
    </g>
    <path d="M0 420 L300 250 L520 420 Z" fill="#000" opacity=".35"/>
    <path d="M680 420 L900 290 L1200 420 Z" fill="#000" opacity=".3"/>
    <circle cx="1020" cy="170" r="80" fill="none" stroke="${p.d}" opacity=".4"/>`,
  // waveform
  (p, i) => `
    <path d="M0 500 Q 100 380 200 500 T 400 500 T 600 500 T 800 500 T 1000 500 T 1200 500" fill="none" stroke="${p.c}" stroke-width="2" opacity=".65"/>
    <path d="M0 540 Q 100 460 200 540 T 400 540 T 600 540 T 800 540 T 1000 540 T 1200 540" fill="none" stroke="#fff" stroke-width="1" opacity=".14"/>
    <circle cx="360" cy="220" r="240" fill="url(#orbA)" opacity=".8"/>
    <circle cx="1000" cy="480" r="170" fill="url(#orbB)" opacity=".6"/>
    <g fill="${p.d}" opacity=".5">
      <circle cx="200" cy="500" r="3"/><circle cx="400" cy="500" r="3"/><circle cx="600" cy="500" r="3"/>
      <circle cx="800" cy="500" r="3"/><circle cx="1000" cy="500" r="3"/>
    </g>`,
];

const labels = [
  "INTERACTIVE", "ANIMATION", "IMAGE SET", "STORY", "FUNSCRIPT",
  "INTERACTIVE", "IMAGE SET", "ANIMATION", "STORY", "FUNSCRIPT",
];

for (let i = 0; i < 10; i++) {
  const p = palettes[i];
  const art = variants[i % variants.length](p, i);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="Abstract neon artwork">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/>
    </linearGradient>
    <radialGradient id="orbA" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${p.c}" stop-opacity=".75"/><stop offset="1" stop-color="${p.c}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orbB" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${p.d}" stop-opacity=".7"/><stop offset="1" stop-color="${p.d}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${p.c}" stop-opacity=".28"/><stop offset="1" stop-color="${p.c}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="42"/></filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".09"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <g filter="url(#blur)">${art}</g>
  <g>${art}</g>
  <rect width="1200" height="675" fill="url(#fade)"/>
  <text x="1080" y="600" font-family="Sora, Inter, sans-serif" font-size="330" font-weight="800" fill="#fff" opacity=".045" text-anchor="end">${p.mark}</text>
  <g font-family="Inter, sans-serif" letter-spacing="4">
    <text x="56" y="70" font-size="13" font-weight="600" fill="#fff" opacity=".55">JERRYHUB</text>
    <text x="56" y="92" font-size="9" fill="${p.c}" opacity=".8">${labels[i]}</text>
  </g>
  <g transform="translate(1080 56)" opacity=".55">
    <rect x="-46" y="-16" width="92" height="24" rx="12" fill="none" stroke="#fff" stroke-opacity=".35"/>
    <text x="0" y="1" font-family="Inter, sans-serif" font-size="9" letter-spacing="2" fill="#fff" text-anchor="middle">MEMBERS</text>
  </g>
  <rect width="1200" height="675" filter="url(#grain)" opacity=".5"/>
</svg>`;
  writeFileSync(join(outDir, `poster-${String(i + 1).padStart(2, "0")}.svg`), svg, "utf8");
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff2d78"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
  <rect width="64" height="64" rx="16" fill="url(#g)"/>
  <path d="M25 19 L46 32 L25 45 Z" fill="#fff"/>
</svg>`;
writeFileSync(join(process.cwd(), "public", "favicon.svg"), favicon, "utf8");
console.log("Generated 10 posters + favicon");
