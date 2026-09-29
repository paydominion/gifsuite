import "server-only";
import fs from "node:fs";
import path from "node:path";
import { MEDIA_DIR } from "@/lib/paths";
import { ffmpeg, gif2webp, probe } from "./ffmpeg";

export const FORMATS = {
  gif: { label: "GIF", mime: "image/gif" },
  mp4: { label: "MP4", mime: "video/mp4" },
  webm: { label: "WebM", mime: "video/webm" },
  webp: { label: "WebP", mime: "image/webp" },
} as const;
export type Format = keyof typeof FORMATS;

export const QUALITIES = {
  low: { maxWidth: 320, fps: 10, gifPalette: "palettegen=max_colors=64:stats_mode=diff",
    gifDither: "bayer:bayer_scale=5", crf: 32, webmCrf: 42, webpQ: 50 },
  medium: { maxWidth: 480, fps: 15, gifPalette: "palettegen=stats_mode=diff",
    gifDither: "bayer:bayer_scale=4", crf: 26, webmCrf: 36, webpQ: 70 },
  // High keeps the source frame rate and (for MP4) the original file untouched.
  high: { maxWidth: 1080, fps: null, gifPalette: "palettegen=stats_mode=full",
    gifDither: "sierra2_4a", crf: null, webmCrf: 30, webpQ: 90 },
} as const;
export type Quality = keyof typeof QUALITIES;

export function isFormat(f: string | null): f is Format {
  return !!f && Object.hasOwn(FORMATS, f);
}

export function isQuality(q: string | null): q is Quality {
  return !!q && Object.hasOwn(QUALITIES, q);
}

export const gifDir = (id: string) => path.join(MEDIA_DIR, id);
export const sourcePath = (id: string) => path.join(gifDir(id), "source.mp4");

export function ffmpegArgs(
  format: Exclude<Format, "webp">, quality: Quality, sourceFps: number, src: string, out: string,
): string[] {
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
  }
}

async function build(id: string, format: Format, quality: Quality, out: string) {
  if (format === "webp") {
    // Re-encode the palette-optimised GIF of the same quality; lossy WebP is typically far smaller.
    const gif = await ensureFormat(id, "gif", quality);
    await gif2webp(["-lossy", "-q", String(QUALITIES[quality].webpQ), "-m", "4", "-mt", gif, "-o", out]);
  } else {
    const src = sourcePath(id);
    const { fps } = await probe(src);
    await ffmpeg(ffmpegArgs(format, quality, fps, src, out));
  }
}

const inFlight = new Map<string, Promise<string>>();

/** Returns the path of `id` in `format`/`quality`, converting from the source once and caching on disk. */
export function ensureFormat(id: string, format: Format, quality: Quality = "medium"): Promise<string> {
  const out = path.join(gifDir(id), `out-${quality}.${format}`);
  if (fs.existsSync(out)) return Promise.resolve(out);

  const key = `${id}:${quality}:${format}`;
  let job = inFlight.get(key);
  if (!job) {
    const tmp = `${out}.${process.pid}.tmp`;
    job = build(id, format, quality, tmp)
      .then(() => {
        fs.renameSync(tmp, out);
        return out;
      })
      .catch((err) => {
        fs.rmSync(tmp, { force: true });
        throw err;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }
  return job;
}
