// Conversion presets, shared by the processor (which runs ffmpeg) and the app (which validates requests).
// Plain JS with no imports so it runs in both Node and Cloudflare Workers.

export const FORMATS = {
  gif: { label: "GIF", mime: "image/gif" },
  mp4: { label: "MP4", mime: "video/mp4" },
  webm: { label: "WebM", mime: "video/webm" },
  webp: { label: "WebP", mime: "image/webp" },
};

export const QUALITIES = {
  low: { maxWidth: 320, fps: 10, gifPalette: "palettegen=max_colors=64:stats_mode=diff",
    gifDither: "bayer:bayer_scale=5", crf: 32, webmCrf: 42, webpQ: 50 },
  medium: { maxWidth: 480, fps: 15, gifPalette: "palettegen=stats_mode=diff",
    gifDither: "bayer:bayer_scale=4", crf: 26, webmCrf: 36, webpQ: 70 },
  // High keeps the source frame rate and (for MP4) the original file untouched.
  high: { maxWidth: 1080, fps: null, gifPalette: "palettegen=stats_mode=full",
    gifDither: "sierra2_4a", crf: null, webmCrf: 30, webpQ: 90 },
};

/** @returns {f is keyof typeof FORMATS} */
export function isFormat(f) {
  return typeof f === "string" && Object.hasOwn(FORMATS, f);
}

/** @returns {q is keyof typeof QUALITIES} */
export function isQuality(q) {
  return typeof q === "string" && Object.hasOwn(QUALITIES, q);
}

/**
 * ffmpeg arguments to turn `src` into `format` at `quality` (WebP is made from the GIF by gif2webp).
 * @param {"gif" | "mp4" | "webm"} format
 * @param {keyof typeof QUALITIES} quality
 * @param {number} sourceFps
 * @param {string} src
 * @param {string} out
 * @returns {string[]}
 */
export function ffmpegArgs(format, quality, sourceFps, src, out) {
  const q = QUALITIES[quality];
  const scale = `scale='min(${q.maxWidth},iw)':-2:flags=lanczos`;
  // Never raise the frame rate above the source: extra frames are duplicates that only add size.
  const fps = q.fps && (!sourceFps || q.fps < sourceFps) ? q.fps : null;
  const video = fps ? `fps=${fps},${scale}` : scale;
  switch (format) {
    case "gif":
      // Palette generated from the clip itself keeps colours accurate at a small size.
      return ["-i", src, "-vf",
        `${video},split[a][b];[a]${q.gifPalette}[p];[b][p]paletteuse=dither=${q.gifDither}:diff_mode=rectangle`,
        "-loop", "0", "-f", "gif", out];
    case "mp4":
      if (q.crf === null) return ["-i", src, "-c", "copy", "-movflags", "+faststart", "-f", "mp4", out];
      return ["-i", src, "-vf", scale, "-c:v", "libx264", "-crf", String(q.crf), "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-f", "mp4", out];
    case "webm":
      return ["-i", src, "-vf", scale, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(q.webmCrf),
        "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-c:a", "libopus", "-f", "webm", out];
    default:
      throw new Error(`ffmpegArgs: unsupported format ${format}`);
  }
}

/** Timeline assets made once per GIF when it's grabbed. */
export const RENDERS = {
  poster: { mime: "image/jpeg", args: (/** @type {string} */ src, /** @type {string} */ out) =>
    ["-i", src, "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", "-q:v", "3", "-f", "image2", out] },
  // Light, silent, capped-length version for autoplaying timeline tiles.
  preview: { mime: "video/mp4", args: (/** @type {string} */ src, /** @type {string} */ out) =>
    ["-i", src, "-t", "15", "-an", "-vf", "scale='min(360,iw)':-2", "-c:v", "libx264", "-crf", "30",
      "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-f", "mp4", out] },
};
