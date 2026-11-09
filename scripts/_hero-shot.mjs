import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:5173";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

for (const width of [1440, 1200]) {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("lhh_age_verified_v1", "true"));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1600));

  const data = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) };
    };
    const frame = document.querySelector(".hero-inset-frame");
    return {
      heroHeight: Math.round(document.querySelector(".hero-stage").getBoundingClientRect().height),
      inset: r(".hero-artwork-inset"),
      text: r(".hero-text-content"),
      transform: frame ? getComputedStyle(frame).transform : null,
      boxShadow: frame ? getComputedStyle(frame).boxShadow : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  console.log(width, JSON.stringify(data, null, 2));
  await page.screenshot({ path: `.screens/posters/hero-tilt-${width}.png` });
}

console.log("ERRORS:", JSON.stringify(errors));
await browser.close();
