// GifSuite's visual language as geometry: sunbursts, halftone dots, spirals and loops.
// Pure functions that return SVG path data or dot lists, used by the logo components,
// the /brand page, and scripts/build-brand.mjs (which writes the static SVG files).

const TAU = Math.PI * 2;
const n = (v) => Number(v.toFixed(1));
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

/**
 * Radius of the burst at angle `theta`, from `valley` (between lobes) to 1 (lobe tips).
 * @param {number} theta @param {number} [lobes] @param {number} [valley] @param {number} [roundness]
 */
export function burstRadius(theta, lobes = 8, valley = 0.6, roundness = 0.85) {
  return valley + (1 - valley) * Math.pow(0.5 + 0.5 * Math.cos(lobes * theta), roundness);
}

/**
 * A soft, rounded many-lobed burst as one closed path.
 * @param {number} cx @param {number} cy @param {number} R
 * @param {{ lobes?: number, valley?: number, roundness?: number }} [o]
 */
export function burstPath(cx, cy, R, o = {}) {
  const points = [];
  for (let i = 0; i < 240; i++) {
    const a = (i / 240) * TAU - Math.PI / 2;
    const [x, y] = polar(cx, cy, R * burstRadius(a + Math.PI / 2, o.lobes, o.valley, o.roundness), a);
    points.push(`${n(x)} ${n(y)}`);
  }
  return `M${points.join("L")}Z`;
}

/**
 * Halftone dots on a 45° screen. `field(x, y)` says how far inside the shape a point is
 * (positive inside, negative outside, roughly -1..1); dots shrink to nothing across the edge.
 * @param {{ size: number, pitch: number, field: (x: number, y: number) => number, soft?: number, maxRatio?: number, min?: number }} o
 * @returns {{ x: number, y: number, r: number }[]}
 */
export function halftoneDots({ size, pitch, field, soft = 0.28, maxRatio = 0.7, min = 0.7 }) {
  const dots = [];
  const step = pitch / Math.SQRT2; // rows of a square grid turned 45°
  for (let row = 0, y = 0; y <= size; row++, y = row * step) {
    for (let x = row % 2 ? step : 0; x <= size; x += step * 2) {
      const t = Math.min(1, Math.max(0, (field(x, y) + soft) / (2 * soft)));
      const r = pitch * maxRatio * (t * t * (3 - 2 * t)); // smoothstep
      if (r >= min) dots.push({ x: n(x), y: n(y), r: n(r) });
    }
  }
  return dots;
}

/** The field for a burst centred in a `size` square: positive inside the burst. */
export function burstField(size, o = {}) {
  const c = size / 2;
  const R = size * (o.scale ?? 0.43);
  return (x, y) => burstRadius(Math.atan2(y - c, x - c) + Math.PI / 2, o.lobes, o.valley, o.roundness) - Math.hypot(x - c, y - c) / R;
}

/** The field for a plain disc. */
export function discField(size, scale = 0.4) {
  const c = size / 2;
  return (x, y) => 1 - Math.hypot(x - c, y - c) / (size * scale);
}

/**
 * An Archimedean spiral from radius r0 out to r1, as a stroke path.
 * @param {number} cx @param {number} cy @param {number} r0 @param {number} r1 @param {number} turns
 */
export function spiralPath(cx, cy, r0, r1, turns) {
  const steps = Math.ceil(turns * 48);
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = polar(cx, cy, r0 + (r1 - r0) * t, t * turns * TAU - Math.PI / 2);
    points.push(`${n(x)} ${n(y)}`);
  }
  return `M${points.join("L")}`;
}

/** A thick open ring with an arrowhead: "loop", the thing GIFs do. Returns the ring stroke and the arrowhead fill. */
export function loopPaths(cx, cy, r, stroke) {
  const start = -Math.PI / 2 + 0.75;
  const end = -Math.PI / 2 + TAU - 0.35;
  const [x0, y0] = polar(cx, cy, r, start);
  const [x1, y1] = polar(cx, cy, r, end);
  const tip = polar(cx, cy, r, end + 0.62);
  const a = polar(cx, cy, r - stroke * 1.15, end);
  const b = polar(cx, cy, r + stroke * 1.15, end);
  return {
    ring: `M${n(x0)} ${n(y0)}A${r} ${r} 0 1 1 ${n(x1)} ${n(y1)}`,
    head: `M${a.map(n).join(" ")}L${b.map(n).join(" ")}L${tip.map(n).join(" ")}Z`,
  };
}

/** A 7×7 dot-matrix letter G. */
export const DOT_G = [
  ".XXXXX.",
  "XX...XX",
  "XX.....",
  "XX.XXXX",
  "XX...XX",
  "XX...XX",
  ".XXXXX.",
];

/** Dots for the dot-matrix G in a `size` box; they shrink toward the bottom-right like a halftone fade. */
export function dotLetter(size, rows = DOT_G) {
  const cell = size / (rows.length + 1);
  const dots = [];
  rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch !== "X") return;
      const fade = 1 - ((row + col) / (2 * (rows.length - 1))) * 0.42;
      dots.push({ x: n(cell * (col + 1)), y: n(cell * (row + 1)), r: n(cell * 0.5 * fade) });
    });
  });
  return dots;
}

export const dotsToSvg = (dots) => dots.map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}"/>`).join("");
