import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:5173";
const OUT = ".screens/posters";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

const errors = [];
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

async function unlock() {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("lhh_age_verified_v1", "true"));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1600));
}

async function audit(label) {
  const info = await page.evaluate(() => {
    const doc = document.documentElement;
    const bad = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > doc.clientWidth + 2) {
        bad.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 70),
          right: Math.round(r.right),
        });
      }
    });

    const broken = [];
    document.querySelectorAll("img").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) {
        broken.push(img.getAttribute("src"));
      }
    });

    const frames = [...document.querySelectorAll(".poster-frame")].slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        ratio: +(r.width / r.height).toFixed(3),
        radius: getComputedStyle(el).borderRadius,
      };
    });

    const faqGaps = [...document.querySelectorAll(".faq-item")].slice(0, 6).map((el, i, all) => {
      if (i === 0) return null;
      return Math.round(el.getBoundingClientRect().top - all[i - 1].getBoundingClientRect().bottom);
    }).filter((n) => n !== null);

    const font = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).fontFamily : null;
    };

    const heroStage = document.querySelector(".hero-stage");
    const inset = document.querySelector(".hero-artwork-inset");
    const insetRect = inset ? inset.getBoundingClientRect() : null;
    const insetImg = inset ? inset.querySelector("img") : null;
    const marqueeGroup = document.querySelector(".hero-marquee-group");
    const gameFrames = [...document.querySelectorAll("#games .poster-frame")]
      .slice(0, 4)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(3) };
      });

    return {
      viewport: { w: innerWidth, h: innerHeight },
      overflowX: doc.scrollWidth - doc.clientWidth,
      overflowing: bad.slice(0, 8),
      broken,
      frames,
      faqGaps,
      fonts: {
        hero: font(".hero-headline"),
        section: font(".section-header .section-title"),
        button: font(".hero-watch-cta"),
        cardTitle: font(".poster-title"),
        nav: font(".nav-link"),
      },
      heroStageHeight: heroStage ? Math.round(heroStage.getBoundingClientRect().height) : null,
      marqueeGap: marqueeGroup ? getComputedStyle(marqueeGroup).gap : null,
      inset: insetRect
        ? {
            visible: getComputedStyle(inset).display !== "none",
            w: Math.round(insetRect.width),
            h: Math.round(insetRect.height),
            imgLoaded: !!insetImg && insetImg.complete && insetImg.naturalWidth > 0,
          }
        : null,
      gameFrames,
      marqueePanels: document.querySelectorAll(".hero-marquee-panel").length,
      heroThumbs: document.querySelectorAll(".hero-thumb-btn").length,
      cards: document.querySelectorAll(".poster-card").length,
      h1: document.querySelector("h1")?.textContent?.trim(),
    };
  });
  console.log(`\n[${label}]`, JSON.stringify(info, null, 2));
  return info;
}

async function shot(name, selector, offset = 80) {
  if (selector) {
    await page.evaluate((sel, off) => {
      document.documentElement.style.scrollBehavior = "auto";
      const el = document.querySelector(sel);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
    }, selector, offset);
    await new Promise((r) => setTimeout(r, 450));
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

// ---------- desktop ----------
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await unlock();
await audit("home-1440");
const transformA = await page.evaluate(() => getComputedStyle(document.querySelector(".hero-marquee-track")).transform);
await new Promise((r) => setTimeout(r, 1200));
const transformB = await page.evaluate(() => getComputedStyle(document.querySelector(".hero-marquee-track")).transform);
console.log("\n[marquee-motion]", JSON.stringify({ transformA, transformB, moving: transformA !== transformB }));
await shot("home-hero-1440");
await shot("home-trending-1440", "#trending");
await shot("home-arts-1440", "#nsfw-arts-videos");
await shot("home-games-1440", "#games");
await shot("home-faq-1440", "#faq");

await page.goto(`${BASE}/faq`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 900));
await audit("faq-1440");
await shot("faq-1440");

await page.goto(`${BASE}/browse`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1200));
await audit("browse-1440");
await shot("browse-1440");

await page.goto(`${BASE}/content/stepmom-got-pregnant`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1200));
await audit("detail-1440");
await shot("detail-1440");

// ---------- tablet ----------
await page.setViewport({ width: 820, height: 1180, deviceScaleFactor: 1 });
await unlock();
await audit("home-820");
await shot("home-hero-820");
await shot("home-games-820", "#games");
await shot("home-faq-820", "#faq");

// ---------- mobile ----------
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await unlock();
await audit("home-390");
await shot("home-hero-390");
await shot("home-trending-390", "#trending");
await shot("home-games-390", "#games");
await shot("home-faq-390", "#faq");

await page.goto(`${BASE}/browse`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1000));
await audit("browse-390");
await shot("browse-390");

await page.goto(`${BASE}/content/stepmom-got-pregnant`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1000));
await audit("detail-390");
await shot("detail-390");

console.log("\nERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
