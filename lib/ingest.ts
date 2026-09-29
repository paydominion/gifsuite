import "server-only";
import { findGifByTweet, insertGif, newGifId, type Gif } from "@/db/gifs";
import { fetchTweetMedia, GrabError } from "@/lib/x/fetchTweetMedia";
import { probe, render } from "@/lib/media/processor";
import { putMedia } from "@/lib/storage";
import { setting } from "@/lib/cloudflare";

const MAX_BYTES = () => Number(setting("MAX_SOURCE_MB") ?? 50) * 1024 * 1024;
const MAX_DURATION_MS = () => Number(setting("MAX_DURATION_S") ?? 60) * 1000;

const tooLarge = () => new GrabError("That video is too large to turn into a GIF.", 413);
const tooLong = () => new GrabError(`That video is longer than ${MAX_DURATION_MS() / 1000}s. Pick a shorter clip.`, 413);

/** Downloads the MP4 into memory, refusing anything over the size limit (even if it lies about its size). */
async function download(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok || !res.body) throw new Error(`media download HTTP ${res.status}`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES()) throw tooLarge();

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES()) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

/**
 * Grab the GIF/video from an X post link and add it to the library.
 * Returns the existing entry if that post's media was grabbed before.
 */
export async function ingestFromX(link: string): Promise<{ gif: Gif; created: boolean }> {
  const media = await fetchTweetMedia(link);

  const existing = await findGifByTweet(media.tweetId, media.mediaIndex);
  if (existing) return { gif: existing, created: false };
  if (media.durationMs > MAX_DURATION_MS()) throw tooLong();

  const video = await download(media.mp4Url);
  const info = await probe(video);
  if (info.durationMs > MAX_DURATION_MS()) throw tooLong();

  const [poster, preview] = await Promise.all([render(video, "poster"), render(video, "preview")]);

  // Files first, then the row: the GIF only appears once everything it needs is stored.
  const id = newGifId();
  await Promise.all([
    putMedia(id, "source.mp4", video, "video/mp4"),
    putMedia(id, "poster.jpg", poster, "image/jpeg"),
    putMedia(id, "preview.mp4", preview, "video/mp4"),
  ]);

  try {
    const gif = await insertGif({
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
    // (This GIF's files stay in R2 unreferenced; harmless and rare.)
    const raced = await findGifByTweet(media.tweetId, media.mediaIndex);
    if (raced) return { gif: raced, created: false };
    throw err;
  }
}
