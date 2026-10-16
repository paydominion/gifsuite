#!/usr/bin/env node
// Renders the PNG brand images from HTML in Chrome (the same one the browser tests use), so they get
// the real font and artwork. Run `npm run images` after changing the brand; the output is committed.
//   public/brand/og.png        1200×630 link preview for social shares and chats
//   public/apple-touch-icon.png 180×180 home-screen icon on iPhone and iPad
//   public/icon-192.png, public/icon-512.png  app icons for the web app manifest (Android, installs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => `file://${path.join(ROOT, p)}`;
const icon = fs.readFileSync(path.join(ROOT, "app/icon.svg"), "utf8");

const FONT = `@font-face { font-family: Satoshi; src: url("${url("app/fonts/Satoshi-Variable.woff2")}") format("woff2"); font-weight: 300 900; }`;
const BASE = `${FONT} * { margin: 0; box-sizing: border-box; } body { background: #111110; color: #f5f2e6; font-family: Satoshi, sans-serif; }`;

const og = `<!doctype html><html><head><style>${BASE}
  body { width: 1200px; height: 630px; overflow: hidden; position: relative; }
  .sun { position: absolute; right: -430px; top: 50%; width: 900px; transform: translateY(-50%); }
  .text { position: absolute; left: 80px; top: 50%; transform: translateY(-50%); width: 600px; }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 800; letter-spacing: -0.5px; }
  .brand svg { width: 64px; height: 64px; }
  h1 { margin-top: 40px; font-size: 72px; line-height: 1.02; font-weight: 900; letter-spacing: -2px; }
  p { margin-top: 26px; font-size: 30px; line-height: 1.35; color: #c9c5b8; font-weight: 500; }
  .url { position: absolute; left: 80px; bottom: 54px; font-size: 26px; font-weight: 700; color: #ffdc4a; }
</style></head><body>
  <img class="sun" src="${url("public/brand/burst.svg")}" alt="">
  <div class="text">
    <div class="brand">${icon}<span>GifSuite</span></div>
    <h1>Grab, convert and make GIFs.</h1>
    <p>Free GIF tools: grab from X, Giphy or Reddit, convert, compress, crop, trim and add text.</p>
  </div>
  <div class="url">gifsuite.com</div>
</body></html>`;

/** The tab icon on its own, full bleed for iOS (which rounds the corners itself) and padded for Android masks. */
const appIcon = (size, padding) => `<!doctype html><html><head><style>${BASE}
  body { width: ${size}px; height: ${size}px; display: grid; place-items: center; }
  svg { width: ${size - padding * 2}px; height: ${size - padding * 2}px; }
  svg rect { rx: 0; }
</style></head><body>${icon}</body></html>`;

const jobs = [
  ["public/brand/og.png", og, 1200, 630],
  ["public/apple-touch-icon.png", appIcon(180, 0), 180, 180],
  ["public/icon-192.png", appIcon(192, 0), 192, 192],
  // Android "maskable" icons may be cropped to a circle: keep the mark inside the middle 80%.
  ["public/icon-512.png", appIcon(512, 52), 512, 512],
];

const browser = await chromium.launch({ channel: "chrome" });
for (const [file, html, width, height] of jobs) {
  const page = await browser.newPage({ viewport: { width, height } });
  // Opened from a file (not setContent): an about:blank page isn't allowed to load the local font and artwork.
  const tmp = path.join(ROOT, ".images.tmp.html");
  fs.writeFileSync(tmp, html);
  await page.goto(url(".images.tmp.html"), { waitUntil: "networkidle" });
  fs.rmSync(tmp);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(ROOT, file), type: "png" });
  await page.close();
  console.log(`images: ${file} (${(fs.statSync(path.join(ROOT, file)).size / 1024).toFixed(0)} KB)`);
}
await browser.close();
