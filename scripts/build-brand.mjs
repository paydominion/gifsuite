#!/usr/bin/env node
// Writes the static brand artwork from lib/brand.mjs. Run `npm run brand` after changing the
// geometry or the colours; the output files are committed.
//   public/brand/burst.svg   the large halftone sunburst behind the home page headline
//   public/brand/band.svg    a tileable halftone band used as a divider
//   app/icon.svg             the browser tab icon
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { burstField, burstPath, dotsToSvg, halftoneDots, spiralPath } from "../lib/brand.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const YELLOW = "#ffdc4a";
const INK = "#111110";

const write = (file, svg) => {
  const full = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, svg + "\n");
  console.log(`brand: ${file} (${(svg.length / 1024).toFixed(1)} KB)`);
};

// The hero sunburst: dots on a 45° screen that dissolve at the edge. Above a ratio of 0.71 neighbouring
// dots merge, so the centre is solid yellow (text can sit on it) and only the rim is halftone.
const SIZE = 1000;
write(
  "public/brand/burst.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" fill="${YELLOW}">` +
    dotsToSvg(halftoneDots({ size: SIZE, pitch: 27, field: burstField(SIZE, { scale: 0.45 }), soft: 0.24, maxRatio: 0.78, min: 0.9 })) +
    `</svg>`,
);

// The divider band: staggered rows of dots that shrink downward. Tiles horizontally every 14px.
const PITCH = 14;
const ROWS = 8;
let band = "";
for (let row = 0; row < ROWS; row++) {
  const r = (PITCH * 0.4 * Math.pow(1 - row / ROWS, 1.3)).toFixed(2);
  const y = PITCH / 2 + row * (PITCH / 2);
  const xs = row % 2 ? [PITCH / 2] : [0, PITCH];
  for (const x of xs) band += `<circle cx="${x}" cy="${y}" r="${r}"/>`;
}
write(
  "public/brand/band.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PITCH} ${PITCH / 2 + ROWS * (PITCH / 2)}" fill="${YELLOW}">${band}</svg>`,
);

// The tab icon: the solid burst-and-spiral mark on an ink tile (halftone would blur at 16px).
write(
  "app/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" rx="22" fill="${INK}"/>` +
    `<path d="${burstPath(50, 50, 42)}" fill="${YELLOW}"/>` +
    `<path d="${spiralPath(50, 50, 2.6, 19, 1.7)}" fill="none" stroke="${INK}" stroke-width="6.6" stroke-linecap="round"/>` +
    `</svg>`,
);
