import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { findGifByTweet, insertGif, newGifId, type Gif } from "@/db/gifs";
import { MEDIA_DIR } from "@/db";
import { fetchTweetMedia, GrabError } from "@/lib/x/fetchTweetMedia";
import { ffmpeg, probe } from "@/lib/media/ffmpeg";

const MAX_BYTES = Number(process.env.MAX_SOURCE_MB ?? 50) * 1024 * 1024;
const MAX_DURATION_MS = Number(process.env.MAX_DURATION_S ?? 60) * 1000;

async function download(url: string, dest: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok || !res.body) throw new Error(`media download HTTP ${res.status}`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
    throw new GrabError("That video is too large to turn into a GIF.", 413);
  }
  let bytes = 0;
  const body = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
  body.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) body.destroy(new GrabError("That video is too large to turn into a GIF.", 413));
  });
  await pipeline(body, fs.createWriteStream(dest));
}

/**
 * Grab the GIF/video from an X post link and add it to the library.
 * Returns the existing entry if that post's media was grabbed before.
 */
export async function ingestFromX(link: string): Promise<{ gif: Gif; created: boolean }> {
  const media = await fetchTweetMedia(link);

  const existing = findGifByTweet(media.tweetId, media.mediaIndex);
  if (existing) return { gif: existing, created: false };

  if (media.durationMs > MAX_DURATION_MS) {
    throw new GrabError(`That video is longer than ${MAX_DURATION_MS / 1000}s. Pick a shorter clip.`, 413);
  }

  const id = newGifId();
  const tmpDir = path.join(MEDIA_DIR, `.tmp-${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const src = path.join(tmpDir, "source.mp4");
    await download(media.mp4Url, src);

    const info = await probe(src);
    if (info.durationMs > MAX_DURATION_MS) {
      throw new GrabError(`That video is longer than ${MAX_DURATION_MS / 1000}s. Pick a shorter clip.`, 413);
    }

    await ffmpeg(["-i", src, "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", "-q:v", "3",
      path.join(tmpDir, "poster.jpg")]);
    // Light, silent, capped-length version for autoplaying timeline tiles.
    await ffmpeg(["-i", src, "-t", "15", "-an", "-vf", "scale='min(360,iw)':-2", "-c:v", "libx264",
      "-crf", "30", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      path.join(tmpDir, "preview.mp4")]);

    fs.renameSync(tmpDir, path.join(MEDIA_DIR, id));

    try {
      const gif = insertGif({
        id,
        tweetId: media.tweetId,
        mediaIndex: media.mediaIndex,
        mediaType: media.mediaType,
        sourceUrl: media.mp4Url,
        tweetUrl: media.tweetUrl,
        authorHandle: media.authorHandle,
        authorName: media.authorName,
        tweetText: media.text,
        tweetLikes: media.likes,
        tweetRetweets: media.retweets,
        width: info.width || media.width,
        height: info.height || media.height,
        durationMs: info.durationMs,
        hasAudio: info.hasAudio,
      });
      return { gif, created: true };
    } catch (err) {
      // Someone else grabbed the same post at the same moment; keep theirs.
      fs.rmSync(path.join(MEDIA_DIR, id), { recursive: true, force: true });
      const raced = findGifByTweet(media.tweetId, media.mediaIndex);
      if (raced) return { gif: raced, created: false };
      throw err;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
