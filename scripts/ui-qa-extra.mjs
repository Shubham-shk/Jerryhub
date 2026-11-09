import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = ".screens/ui";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});
const errors = [];
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

async function prep() {
  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("lhh_age_verified_v1", "true"));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));
}

async function info(label) {
  const d = await page.evaluate(() => {
    const doc = document.documentElement;
    const nav = document.querySelector(".nav-floating-bar")?.getBoundingClientRect();
    const hero = document.querySelector(".page-hero")?.getBoundingClientRect();
    const eyebrow = document.querySelector(".page-hero .eyebrow")?.getBoundingClientRect();
    return {
      w: innerWidth,
      overflowX: doc.scrollWidth - doc.clientWidth,
      nav: nav ? { top: Math.round(nav.top), bottom: Math.round(nav.bottom), left: Math.round(nav.left), right: Math.round(nav.right) } : null,
      pageHeroTop: hero ? Math.round(hero.top) : null,
      eyebrowTop: eyebrow ? Math.round(eyebrow.top) : null,
    };
  });
  console.log(label, JSON.stringify(d));
}

const viewports = [
  { name: "1600", width: 1600, height: 1000, dsf: 1, mobile: false },
  { name: "1024", width: 1024, height: 768, dsf: 1, mobile: false },
  { name: "820", width: 820, height: 1180, dsf: 1, mobile: true },
];

for (const v of viewports) {
  await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: v.dsf, isMobile: v.mobile, hasTouch: v.mobile });
  await prep();
  for (const p of [
    { name: "home", path: "/" },
    { name: "browse", path: "/browse" },
    { name: "detail", path: "/content/midnight-velvet" },
    { name: "account", path: "/account" },
    { name: "faq", path: "/faq" },
  ]) {
    await page.goto(`http://localhost:5173${p.path}`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 700));
    await info(`[${v.name}:${p.name}]`);
    await page.screenshot({ path: `${OUT}/${p.name}-${v.name}.png` });
  }
}

// Mobile footer + hero detail shots
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await prep();
await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/home-hero-390b.png` });
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, document.documentElement.scrollHeight);
});
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: `${OUT}/footer-390.png` });
await page.evaluate(() => window.scrollTo(0, 0));
await page.goto("http://localhost:5173/account", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: `${OUT}/account-390b.png` });

console.log("ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
