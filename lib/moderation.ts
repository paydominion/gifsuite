import "server-only";
import { after } from "next/server";
import { listUnscanned, saveScanResult } from "@/db/gifs";
import { logEvent } from "@/lib/analytics";
import { setting } from "@/lib/cloudflare";
import { scanNsfw } from "@/lib/media/processor";
import { DEFAULT_NSFW_THRESHOLD, nsfwVerdict } from "@/lib/nsfw";
import { readMedia } from "@/lib/storage";

/**
 * The NSFW check gates the public timeline only. Grabbing, downloading and sharing never wait for
 * it: a public GIF starts as "not checked" (off the timeline) and is scanned after the response
 * has been sent. A scheduled sweep (`scanPending`) retries any scan that didn't finish.
 */
export async function scanGif(id: string): Promise<void> {
  const started = Date.now();
  const video = await readMedia(id, "source.mp4");
  if (!video) return;
  let scores;
  try {
    scores = await scanNsfw(video);
  } catch (err) {
    logEvent(null, "nsfw_check", { gifId: id, source: "scan", outcome: "error", durationMs: Date.now() - started });
    throw err;
  }
  const threshold = Number(setting("NSFW_THRESHOLD")) || DEFAULT_NSFW_THRESHOLD;
  const verdict = nsfwVerdict(false, scores, threshold);
  await saveScanResult(id, verdict);
  logEvent(null, "nsfw_check", {
    gifId: id,
    source: "scan",
    outcome: verdict.nsfw ? "flagged" : "safe",
    score: verdict.score ?? 0,
    durationMs: Date.now() - started,
    bytesIn: video.byteLength,
  });
}

/** Scan this GIF once the current response is done. Failures are left for the sweep. */
export function scanAfterResponse(id: string): void {
  after(async () => {
    try {
      await scanGif(id);
    } catch (err) {
      console.error(`[nsfw] background scan of ${id} failed; the sweep will retry:`, err);
    }
  });
}

/** Scan public GIFs still waiting for a check, oldest first. Returns how many were scanned. */
export async function scanPending(limit = 10): Promise<{ scanned: number; failed: number }> {
  let scanned = 0;
  let failed = 0;
  for (const id of await listUnscanned(limit)) {
    try {
      await scanGif(id);
      scanned++;
    } catch (err) {
      failed++;
      console.error(`[nsfw] sweep could not scan ${id}:`, err);
    }
  }
  return { scanned, failed };
}
