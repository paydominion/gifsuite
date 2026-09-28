import fs from "node:fs";
import path from "node:path";
import { MEDIA_DIR } from "@/db";
import { ffmpeg } from "./ffmpeg";

export const FORMATS = {
  gif: { label: "GIF", mime: "image/gif" },
  mp4: { label: "MP4", mime: "video/mp4" },
  webm: { label: "WebM", mime: "video/webm" },
  webp: { label: "WebP", mime: "image/webp" },
} as const;
export type Format = keyof typeof FORMATS;

export function isFormat(f: string | null): f is Format {
  return !!f && Object.hasOwn(FORMATS, f);
}

export const gifDir = (id: string) => path.join(MEDIA_DIR, id);
export const sourcePath = (id: string) => path.join(gifDir(id), "source.mp4");

const SCALE = "scale='min(480,iw)':-2:flags=lanczos";

function argsFor(format: Format, src: string, out: string): string[] {
  switch (format) {
    case "gif":
      // Palette generated from the clip itself keeps colours accurate at a small size.
      return ["-i", src, "-vf",
        `fps=15,${SCALE},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
        "-loop", "0", "-f", "gif", out];
    case "mp4":
      return ["-i", src, "-c", "copy", "-movflags", "+faststart", "-f", "mp4", out];
    case "webm":
      return ["-i", src, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", "-row-mt", "1",
        "-deadline", "good", "-cpu-used", "4", "-c:a", "libopus", "-f", "webm", out];
    case "webp":
      return ["-i", src, "-vf", `fps=15,${SCALE}`, "-c:v", "libwebp", "-lossless", "0",
        "-q:v", "70", "-loop", "0", "-an", "-f", "webp", out];
  }
}

const inFlight = new Map<string, Promise<string>>();

/** Returns the path of `id` in `format`, converting from the source once and caching on disk. */
export function ensureFormat(id: string, format: Format): Promise<string> {
  const out = path.join(gifDir(id), `out.${format}`);
  if (fs.existsSync(out)) return Promise.resolve(out);

  const key = `${id}:${format}`;
  let job = inFlight.get(key);
  if (!job) {
    const tmp = `${out}.${process.pid}.tmp`;
    job = ffmpeg(argsFor(format, sourcePath(id), tmp))
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
