import "server-only";
import { findGifByTweet, insertGif, newGifId, type Gif, type NewGif, type NsfwVerdict } from "@/db/gifs";
import { fetchTweetMedia, GrabError, isXLink } from "@/lib/x/fetchTweetMedia";
import { extractLink, linkKey, siteName } from "@/lib/links";
import { fetchLink, probe, ProcessorError, render } from "@/lib/media/processor";
import { logEvent } from "@/lib/analytics";
import { scanAfterResponse } from "@/lib/moderation";
import { nsfwVerdict } from "@/lib/nsfw";
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

export type GrabOptions = {
  /** Show it on the public timeline. Only applies when this grab creates the GIF. */
  isPublic: boolean;
  /** Hash of the grabbing browser's owner key, so it can change visibility later. */
  ownerKeyHash: string | null;
};

/**
 * Grab the GIF/video from an X post link and add it to the library.
 * Returns the existing entry if that post's media was grabbed before; its visibility is left as is.
 */
export async function ingestFromX(link: string, options: GrabOptions): Promise<{ gif: Gif; created: boolean }> {
  const media = await fetchTweetMedia(link);

  const existing = await findGifByTweet(media.tweetId, media.mediaIndex);
  if (existing) return { gif: existing, created: false };
  if (media.durationMs > MAX_DURATION_MS()) throw tooLong();

  const video = await download(media.mp4Url);
  const info = await probe(video);
  if (info.durationMs > MAX_DURATION_MS()) throw tooLong();

  // X's own sensitive mark settles it now. Otherwise the GIF starts unchecked, which only keeps it
  // off the timeline; a public one is scanned once this response has gone out.
  return store(video, options, nsfwVerdict(media.sensitive, null), {
    source: "x",
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
}

type Details = Omit<NewGif, "id" | "isPublic" | "ownerKeyHash" | "verdict">;

/** Makes the poster and preview, stores the files, then the row, and queues the NSFW check. */
async function store(video: ArrayBuffer, options: GrabOptions, verdict: NsfwVerdict, details: Details) {
  const [poster, preview] = await Promise.all([render(video, "poster"), render(video, "preview")]);

  // Files first, then the row: the GIF only appears once everything it needs is stored.
  const id = newGifId();
  await Promise.all([
    putMedia(id, "source.mp4", video, "video/mp4"),
    putMedia(id, "poster.jpg", poster, "image/jpeg"),
    putMedia(id, "preview.mp4", preview, "video/mp4"),
  ]);

  try {
    const gif = await insertGif({ ...details, id, isPublic: options.isPublic, ownerKeyHash: options.ownerKeyHash, verdict });
    if (gif.isPublic && gif.nsfw === null) scanAfterResponse(gif.id);
    if (verdict.source === "x" || verdict.source === "site") {
      logEvent(null, "nsfw_check", { gifId: gif.id, source: verdict.source, outcome: "flagged" });
    }
    return { gif, created: true };
  } catch (err) {
    // Someone else grabbed the same thing at the same moment; keep theirs.
    // (This GIF's files stay in R2 unreferenced; harmless and rare.)
    const raced = await findGifByTweet(details.tweetId, details.mediaIndex);
    if (raced) return { gif: raced, created: false };
    throw err;
  }
}

/** Processor answers for a link, as messages a person can act on. */
function linkFailure(err: unknown): never {
  if (!(err instanceof ProcessorError)) throw err;
  const reason = (() => {
    try {
      return (JSON.parse(err.message) as { error?: string }).error ?? "";
    } catch {
      return "";
    }
  })();
  switch (err.status) {
    case 400:
      throw new GrabError(reason === "private address" ? "That link points at a private address." : "That doesn't look like a web link.");
    case 403:
      throw new GrabError("That site only shows this to signed-in users, so GifSuite can't grab it.", 403);
    case 404:
      throw new GrabError("Nothing is at that link any more, or the site doesn't exist.", 404);
    case 413:
      throw reason === "too long" ? tooLong() : tooLarge();
    case 415:
      throw new GrabError(
        reason === "animated webp" ? "Animated WebP links aren't supported yet. Try the GIF or MP4 link." : "That link isn't a GIF or video.",
        415,
      );
    case 422:
      throw new GrabError("Couldn't find a GIF or video at that link.", 422);
    default:
      throw new GrabError("That site didn't send the GIF. Try again in a minute.", 502);
  }
}

/** Grab the GIF or video behind any non-X link: a direct file, or a page yt-dlp understands. */
export async function ingestFromLink(input: string, options: GrabOptions): Promise<{ gif: Gif; created: boolean }> {
  const url = extractLink(input);
  if (!url) throw new GrabError("That doesn't look like a link. Paste a link to a post or a GIF.");
  const key = linkKey(url);
  const existing = await findGifByTweet(key, 0);
  if (existing) return { gif: existing, created: false };

  const { video, info } = await fetchLink(url.href, { maxBytes: MAX_BYTES(), maxDurationMs: MAX_DURATION_MS() }).catch(linkFailure);
  if (info.durationMs > MAX_DURATION_MS()) throw tooLong();
  const site = siteName(url);
  const uploader = (info.uploader ?? "").slice(0, 80);

  return store(video, options, nsfwVerdict((info.ageLimit ?? 0) >= 18, null, undefined, "site"), {
    source: site,
    tweetId: key,
    mediaIndex: 0,
    mediaType: info.hasAudio ? "video" : "animated_gif",
    sourceUrl: info.mediaUrl || url.href,
    tweetUrl: info.webpageUrl || url.href,
    authorHandle: (info.uploaderId || uploader || site).slice(0, 80),
    authorName: uploader || site,
    tweetText: (info.title ?? "").slice(0, 500),
    tweetLikes: info.likes ?? 0,
    tweetRetweets: 0,
    width: info.width,
    height: info.height,
    durationMs: info.durationMs,
    hasAudio: info.hasAudio,
  });
}

/** Grab from whatever was pasted: X links take the X path, anything else the any-link path. */
export function ingest(input: string, options: GrabOptions) {
  return isXLink(input) ? ingestFromX(input, options) : ingestFromLink(input, options);
}
