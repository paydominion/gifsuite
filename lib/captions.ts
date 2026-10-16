/**
 * Caption layout and drawing for the Captions tool. The same code draws the live preview and the
 * full-size transparent PNG that the processor lays over every frame, so the result matches the
 * preview exactly. Fonts are openly licensed (SIL OFL), as the Satoshi licence forbids using Satoshi
 * for people's own content.
 */
export type CaptionFont = "meme" | "fun" | "clean";
export type CaptionSize = "s" | "m" | "l";
export type CaptionColor = "white" | "yellow" | "black";

export type CaptionStyle = {
  top: string;
  bottom: string;
  font: CaptionFont;
  size: CaptionSize;
  color: CaptionColor;
  outline: boolean;
  uppercase: boolean;
};

export const MAX_CAPTION_CHARS = 120;

export const FONT_FAMILY: Record<CaptionFont, string> = {
  // Names with spaces must be quoted, or canvas silently falls back to another font.
  meme: "'GifSuite Anton', Impact, sans-serif",
  fun: "'GifSuite Comic Neue', 'Comic Sans MS', sans-serif",
  clean: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};
const WEIGHT: Record<CaptionFont, string> = { meme: "400", fun: "700", clean: "800" };
/** Font files the browser loads before drawing (served from /public, OFL licences alongside). */
export const FONT_FILES: { family: string; url: string; weight: string }[] = [
  { family: "GifSuite Anton", url: "/fonts/captions/Anton-Regular.ttf", weight: "400" },
  { family: "GifSuite Comic Neue", url: "/fonts/captions/ComicNeue-Bold.ttf", weight: "700" },
];

const SIZE_FACTOR: Record<CaptionSize, number> = { s: 0.08, m: 0.11, l: 0.14 };
const FILL: Record<CaptionColor, string> = { white: "#ffffff", yellow: "#ffdc4a", black: "#111110" };

export type Line = { text: string; y: number };
export type Block = { fontSize: number; lines: Line[] };

/** Splits text into lines no wider than `maxWidth`. Words longer than a line are kept whole (the size shrinks). */
export function wrap(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (line && measure(tryLine) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = tryLine;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * Lays out the top and bottom captions for a w×h frame. `measure(text, fontSize)` returns a width.
 * Text shrinks (down to 4% of the height) until every line fits and a block fills no more than 40%
 * of the height.
 */
export function layoutCaptions(style: CaptionStyle, w: number, h: number, measure: (s: string, fontSize: number) => number) {
  const pad = Math.round(h * 0.04);
  const maxWidth = w * 0.92;
  const block = (raw: string, where: "top" | "bottom"): Block | null => {
    const text = (style.uppercase ? raw.toUpperCase() : raw).trim().slice(0, MAX_CAPTION_CHARS);
    if (!text) return null;
    let fontSize = Math.max(8, h * SIZE_FACTOR[style.size]);
    let lines: string[] = [];
    for (; fontSize >= Math.max(8, h * 0.04); fontSize *= 0.92) {
      lines = wrap(text, maxWidth, (s) => measure(s, fontSize));
      const fits = lines.every((l) => measure(l, fontSize) <= maxWidth) && lines.length * fontSize * 1.1 <= h * 0.4;
      if (fits) break;
    }
    const lineHeight = fontSize * 1.1;
    const firstY = where === "top" ? pad + fontSize : h - pad - (lines.length - 1) * lineHeight;
    return { fontSize: Math.round(fontSize), lines: lines.map((t, i) => ({ text: t, y: Math.round(firstY + i * lineHeight) })) };
  };
  return { top: block(style.top, "top"), bottom: block(style.bottom, "bottom") };
}

export const hasCaption = (s: CaptionStyle) => !!(s.top.trim() || s.bottom.trim());

/** Draws the captions onto a canvas context sized w×h (transparent background). */
export function drawCaptions(ctx: CanvasRenderingContext2D, style: CaptionStyle, w: number, h: number) {
  const font = (size: number) => `${WEIGHT[style.font]} ${size}px ${FONT_FAMILY[style.font]}`;
  const layout = layoutCaptions(style, w, h, (s, size) => {
    ctx.font = font(size);
    return ctx.measureText(s).width;
  });
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  for (const block of [layout.top, layout.bottom]) {
    if (!block) continue;
    ctx.font = font(block.fontSize);
    for (const line of block.lines) {
      if (style.outline) {
        ctx.lineWidth = Math.max(2, block.fontSize * 0.14);
        ctx.strokeStyle = style.color === "black" ? "#ffffff" : "#000000";
        ctx.strokeText(line.text, w / 2, line.y);
      }
      ctx.fillStyle = FILL[style.color];
      ctx.fillText(line.text, w / 2, line.y);
    }
  }
}

/** Loads the caption fonts once, so text is never drawn in a fallback font. */
let fontsReady: Promise<void> | null = null;
export function loadCaptionFonts(): Promise<void> {
  fontsReady ??= Promise.all(
    FONT_FILES.map(async (f) => {
      const face = new FontFace(f.family, `url(${f.url})`, { weight: f.weight });
      document.fonts.add(await face.load());
    }),
  ).then(() => undefined);
  return fontsReady;
}

/** The full-size transparent PNG the processor lays over every frame. */
export async function captionPng(style: CaptionStyle, w: number, h: number): Promise<Blob> {
  await loadCaptionFonts();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  drawCaptions(canvas.getContext("2d")!, style, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the caption."))), "image/png"));
}
