import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = ".screens/ui";
fs.mkdirSync(OUT, { recursive: true });

const pagesToVisit = [
  { name: "home", path: "/" },
  { name: "browse", path: "/browse" },
  { name: "trending", path: "/trending" },
  { name: "newest-games", path: "/newest?category=games" },
  { name: "faq", path: "/faq" },
  { name: "detail", path: "/content/midnight-velvet" },
  { name: "account", path: "/account" },
  { name: "admin", path: "/admin" },
  { name: "legal", path: "/legal/terms" },
  { name: "notfound", path: "/nope-404" },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const errors = [];

async function prepare(page) {
  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("lhh_age_verified_v1", "true"));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
}

async function audit(page, label, viewport) {
  const info = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const nav = document.querySelector(".nav-floating-bar");
    const navRect = nav?.getBoundingClientRect();
    const bad = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > doc.clientWidth + 2) {
        bad.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 80),
          right: Math.round(r.right),
        });
      }
    });
    return {
      viewport: { w: innerWidth, h: innerHeight },
      overflowX,
      nav: navRect
        ? { left: Math.round(navRect.left), right: Math.round(navRect.right), width: Math.round(navRect.width), height: Math.round(navRect.height), top: Math.round(navRect.top) }
        : null,
      scrollHeight: doc.scrollHeight,
      overflowing: bad.slice(0, 12),
      bodyFont: getComputedStyle(document.body).fontFamily,
      h1Font: document.querySelector("h1") ? getComputedStyle(document.querySelector("h1")).fontFamily : null,
      h1Size: document.querySelector("h1") ? getComputedStyle(document.querySelector("h1")).fontSize : null,
      announcement: !!document.querySelector(".announcement"),
      locks: document.querySelectorAll(".lock, [class*='lock-icon'], .poster-lock").length,
    };
  });
  console.log(`[${label}]`, JSON.stringify(info));
  return info;
}

const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await prepare(page);

for (const p of pagesToVisit) {
  await page.goto(`http://localhost:5173${p.path}`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 900));
  await audit(page, `desktop:${p.name}`, "desktop");
  await page.screenshot({ path: `${OUT}/${p.name}-1280.png` });
  const scrolled = await page.evaluate(() => {
    window.scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.45));
    return window.scrollY;
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/${p.name}-1280-mid.png` });
  console.log(`[scroll:${p.name}]`, scrolled);
}

// Mobile pass on key pages
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await prepare(page);
for (const p of pagesToVisit) {
  await page.goto(`http://localhost:5173${p.path}`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 900));
  await audit(page, `mobile:${p.name}`, "mobile");
  await page.screenshot({ path: `${OUT}/${p.name}-390.png` });
}

// Browse grid close-up (mobile)
await page.goto("http://localhost:5173/browse", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const grid = document.querySelector(".poster-grid");
  if (grid) window.scrollTo(0, grid.getBoundingClientRect().top + window.scrollY - 90);
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/browse-grid-390.png` });

// Homepage section shots
await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1000));
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const s = document.querySelector("#trending");
  window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 80);
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/home-trending-390.png` });
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1000));
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const s = document.querySelector("#trending");
  window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 100);
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/home-trending-1280.png` });

console.log("ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
