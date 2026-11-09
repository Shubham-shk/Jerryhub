import puppeteer from "puppeteer-core";
import fs from "node:fs";
const OUT = ".screens/ui";
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

await page.setViewport({ width: 1280, height: 900 });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.removeItem("lhh_age_verified_v1"));
await page.reload({ waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/agegate-1280.png` });

// Accept the gate
const btn = await page.$(".age-gate button, .age-gate .btn, .age-gate-actions button");
if (btn) { await btn.click(); await new Promise((r) => setTimeout(r, 600)); }
await page.screenshot({ path: `${OUT}/after-gate-1280.png` });

// Open a poster to trigger auth prompt
await new Promise((r) => setTimeout(r, 600));
const poster = await page.$(".poster-card--carousel");
if (poster) {
  await poster.click();
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}/auth-modal-1280.png` });
}

console.log("ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
