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

/**
 * Input containers the processor accepts, keyed by ffmpeg demuxer. Forcing the demuxer and
 * file-only protocols stops a crafted upload from being read as a playlist that makes ffmpeg
 * fetch URLs or read other files. (mov also covers MP4.)
 */
export const INPUTS = { gif: "gif", mov: "mov", matroska: "matroska" };

/** @returns {i is keyof typeof INPUTS} */
export function isInput(i) {
  return typeof i === "string" && Object.hasOwn(INPUTS, i);
}

/** @param {keyof typeof INPUTS} input @param {string} src */
export function inputArgs(input, src) {
  return ["-protocol_whitelist", "file", "-f", INPUTS[input], "-i", src];
}

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
 * @param {keyof typeof INPUTS} [input]
 * @returns {string[]}
 */
export function ffmpegArgs(format, quality, sourceFps, src, out, input = "mov") {
  const q = QUALITIES[quality];
  const inp = inputArgs(input, src);
  const scale = `scale='min(${q.maxWidth},iw)':-1:flags=lanczos`;
  // H.264 and VP9 need even dimensions; GIF doesn't care.
  const evenScale = `scale='trunc(min(${q.maxWidth},iw)/2)*2':-2:flags=lanczos`;
  // Never raise the frame rate above the source: extra frames are duplicates that only add size.
  const fps = q.fps && (!sourceFps || q.fps < sourceFps) ? q.fps : null;
  const video = fps ? `fps=${fps},${scale}` : scale;
  switch (format) {
    case "gif":
      // Palette generated from the clip itself keeps colours accurate at a small size.
      return [...inp, "-vf",
        `${video},split[a][b];[a]${q.gifPalette}[p];[b][p]paletteuse=dither=${q.gifDither}:diff_mode=rectangle`,
        "-loop", "0", "-f", "gif", out];
    case "mp4":
      // High keeps an MP4 source untouched; anything else has to be encoded.
      if (q.crf === null && input === "mov") return [...inp, "-c", "copy", "-movflags", "+faststart", "-f", "mp4", out];
      return [...inp, "-vf", evenScale, "-c:v", "libx264", "-crf", String(q.crf ?? 20), "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-f", "mp4", out];
    case "webm":
      return [...inp, "-vf", evenScale, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(q.webmCrf),
        "-row-mt", "1", "-deadline", "good", "-cpu-used", "4",
        // yuva420p keeps GIF transparency and is a pixel format every VP9 decoder accepts.
        "-pix_fmt", "yuva420p", "-c:a", "libopus", "-f", "webm", out];
    default:
      throw new Error(`ffmpegArgs: unsupported format ${format}`);
  }
}

/** Timeline assets made once per GIF when it's grabbed. */
export const RENDERS = {
  poster: { mime: "image/jpeg", args: (/** @type {string} */ src, /** @type {string} */ out) =>
    [...inputArgs("mov", src), "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", "-q:v", "3", "-f", "image2", out] },
  // Light, silent, capped-length version for autoplaying timeline tiles.
  preview: { mime: "video/mp4", args: (/** @type {string} */ src, /** @type {string} */ out) =>
    [...inputArgs("mov", src), "-t", "15", "-an", "-vf", "scale='trunc(min(360,iw)/2)*2':-2", "-c:v", "libx264", "-crf", "30",
      "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-f", "mp4", out] },
};

// ── Compress to a target size ───────────────────────────────────────────────────

/** Limits for the compress tool's search. */
export const COMPRESS = { minWidth: 120, minFps: 5, minColors: 32, maxAttempts: 6 };

/**
 * @typedef {{ width: number, fps: number, colors: number }} GifSettings
 */

/**
 * ffmpeg arguments for a GIF with explicit settings.
 * @param {GifSettings} s @param {string} src @param {string} out @param {keyof typeof INPUTS} [input]
 */
export function gifArgs(s, src, out, input = "mov") {
  return [...inputArgs(input, src), "-vf",
    `fps=${s.fps},scale=${s.width}:-1:flags=lanczos,split[a][b];` +
    `[a]palettegen=max_colors=${s.colors}:stats_mode=diff[p];` +
    `[b][p]paletteuse=dither=bayer:bayer_scale=${s.colors > 128 ? 4 : 5}:diff_mode=rectangle`,
    "-loop", "0", "-f", "gif", out];
}

/**
 * The best-quality settings to try first.
 * @param {{ width: number, fps: number }} source @param {number} [maxWidth] 0 or missing keeps the source width
 * @returns {GifSettings}
 */
export function firstAttempt(source, maxWidth = 0) {
  return {
    width: Math.max(COMPRESS.minWidth, Math.min(source.width, maxWidth || source.width)),
    fps: Math.max(COMPRESS.minFps, Math.min(Math.round(source.fps) || 15, 20)),
    colors: 256,
  };
}

/**
 * Settings that should land under `target` bytes, given that `prev` produced `size` bytes.
 * A GIF's size grows roughly with pixels × frames, so the saving is split between frame rate,
 * colours and width (which counts twice, hence the square root). Returns null once every
 * setting is at its floor and nothing smaller can be tried.
 * @param {GifSettings} prev @param {number} size @param {number} target
 * @returns {GifSettings | null}
 */
export function nextAttempt(prev, size, target) {
  const ratio = Math.min((target / size) * 0.9, 0.95); // aim a little under the target
  let { width, fps, colors } = prev;

  // Frame rate: smooth enough down to 10fps; go lower only when far from the target.
  if (fps > 10) fps = Math.max(10, Math.round(fps * Math.sqrt(ratio)));
  else if (ratio < 0.35) fps = Math.max(COMPRESS.minFps, Math.round(fps * 0.8));

  // Colours: fewer colours are the most visible loss, so drop them late and gently.
  if (ratio < 0.2 && colors > 64) colors = 64;
  else if (ratio < 0.5 && colors > 128) colors = 128;

  // Width takes whatever saving is still needed.
  const colorSaving = colors === prev.colors ? 1 : colors <= 64 ? 0.65 : 0.8;
  const scale = Math.sqrt(Math.min(ratio / ((fps / prev.fps) * colorSaving), 1));
  width = Math.max(COMPRESS.minWidth, Math.min(Math.floor(prev.width * scale), Math.floor(prev.width * 0.95)));

  // Last resort, once the picture can't get any smaller.
  if (width === COMPRESS.minWidth && prev.width === COMPRESS.minWidth && colors > COMPRESS.minColors) {
    colors = COMPRESS.minColors;
  }

  if (width === prev.width && fps === prev.fps && colors === prev.colors) return null;
  return { width, fps, colors };
}

/**
 * When a result lands well under the target, the unused room can buy back width.
 * Returns wider settings to try, or null if the result is already close enough (or as wide as allowed).
 * @param {GifSettings} prev @param {number} size @param {number} target @param {number} maxWidth
 * @returns {GifSettings | null}
 */
export function growAttempt(prev, size, target, maxWidth) {
  if (size > target * 0.75) return null;
  const width = Math.min(maxWidth, Math.floor(prev.width * Math.sqrt((target * 0.92) / size)));
  return width >= prev.width * 1.05 ? { ...prev, width } : null;
}
