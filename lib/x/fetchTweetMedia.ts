import "server-only";
import { setting } from "@/lib/cloudflare";

export class GrabError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type TweetMedia = {
  tweetId: string;
  mediaIndex: number;
  mediaType: "animated_gif" | "video";
  mp4Url: string;
  tweetUrl: string;
  authorHandle: string;
  authorName: string;
  text: string;
  likes: number;
  retweets: number;
  width: number;
  height: number;
  durationMs: number;
  /** X marked the post as possibly sensitive (the author's or X's own label). */
  sensitive: boolean;
};

const X_HOSTS = /^(?:www\.|mobile\.)?(?:x|twitter|fxtwitter|vxtwitter|fixupx|fixvx)\.com$/i;

// An X post link inside other pasted text: quotes, "@", <angle brackets>, or words around it.
// The host must start the match (not "evilx.com") and be followed by "/" (not "x.com.evil.com").
const EMBEDDED_POST_LINK =
  /(?<![\w.-])(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter|fxtwitter|vxtwitter|fixupx|fixvx)\.com\/[^\s"'<>]*?\/status(?:es)?\/\d{1,25}[^\s"'<>]*/i;

/** True if the pasted text is meant for X: an X post link anywhere in it, or a link to an X host or t.co. */
export function isXLink(input: string): boolean {
  const text = input.trim();
  if (EMBEDDED_POST_LINK.test(text)) return true;
  const first = text.match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?=[/:?#\s"'>)]|$)/i)?.[1] ?? "";
  return X_HOSTS.test(first) || /^t\.co$/i.test(first);
}

/**
 * Accepts any X/Twitter post link, e.g.
 *   https://x.com/user/status/123/video/1?s=46
 *   https://mobile.twitter.com/user/status/123
 * even with other text pasted around it ("look: https://x.com/…", "\"https://x.com/…\"").
 * Returns the post id and the 0-based media slot the link points at (if any).
 */
export function parseTweetUrl(input: string): { tweetId: string; mediaSlot: number | null } {
  const text = input.trim();
  // The X post link if there is one; otherwise the first link of any kind, so a non-X link still
  // gets the "only X" message rather than "not a link".
  const candidate = text.match(EMBEDDED_POST_LINK)?.[0] ?? text.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ?? text;
  if (/(?:^|[\s"'<@(])(?:https?:\/\/)?t\.co\//i.test(` ${text}`) && candidate === text) {
    throw new GrabError("That's a shortened t.co link. Open it, then copy the post's own x.com link.");
  }
  let url: URL;
  try {
    url = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
  } catch {
    throw new GrabError("That doesn't look like a link. Paste an X (Twitter) post URL.");
  }
  if (!X_HOSTS.test(url.hostname)) {
    throw new GrabError("Only X (Twitter) post links are supported right now.");
  }
  const m = url.pathname.match(/\/status(?:es)?\/(\d{1,25})(?:\/(?:video|photo)\/(\d+))?/);
  if (!m) throw new GrabError("Couldn't find a post in that link. Open the post and copy its link.");
  return { tweetId: m[1], mediaSlot: m[2] ? Number(m[2]) - 1 : null };
}

// Overridable only so the test suite can point at a local fake X.
// Read per call: on Cloudflare, settings are only available while handling a request.
const syndicationUrl = () => setting("X_SYNDICATION_URL") ?? "https://cdn.syndication.twimg.com/tweet-result";
const mediaHosts = () => (setting("X_MEDIA_HOSTS") ?? "video.twimg.com").split(",");

// Token scheme used by X's own embed widget (same as the react-tweet package).
export function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

type Variant = { bitrate?: number; content_type: string; url: string };
type MediaDetail = {
  type: "photo" | "video" | "animated_gif";
  original_info?: { width: number; height: number };
  video_info?: { duration_millis?: number; variants: Variant[] };
};
type SyndicationTweet = {
  __typename?: string;
  id_str: string;
  text?: string;
  favorite_count?: number;
  retweet_count?: number;
  possibly_sensitive?: boolean;
  user?: { screen_name: string; name: string };
  mediaDetails?: MediaDetail[];
};

function bestMp4(variants: Variant[]): string | null {
  const mp4s = variants.filter((v) => v.content_type === "video/mp4");
  mp4s.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return mp4s[0]?.url ?? null;
}

async function fromSyndication(tweetId: string, mediaSlot: number | null): Promise<TweetMedia> {
  const res = await fetch(
    `${syndicationUrl()}?id=${tweetId}&lang=en&token=${syndicationToken(tweetId)}`,
    { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) },
  );
  if (res.status === 404) throw new GrabError("That post doesn't exist, was deleted, or is private.", 404);
  if (!res.ok) throw new Error(`syndication HTTP ${res.status}`);
  const body = await res.text();
  if (!body) throw new GrabError("That post doesn't exist, was deleted, or is private.", 404);
  const tweet = JSON.parse(body) as SyndicationTweet;
  if (tweet.__typename === "TweetTombstone") {
    throw new GrabError("That post is unavailable (deleted, private or age-restricted).", 404);
  }

  const media = tweet.mediaDetails ?? [];
  const isMotion = (d: MediaDetail | undefined) => d?.type === "animated_gif" || d?.type === "video";
  const index = mediaSlot !== null && isMotion(media[mediaSlot]) ? mediaSlot : media.findIndex(isMotion);
  if (index < 0) throw new GrabError("That post has no GIF or video in it.", 422);

  const detail = media[index];
  const mp4Url = bestMp4(detail.video_info?.variants ?? []);
  if (!mp4Url) throw new Error("no mp4 variant in syndication response");

  const handle = tweet.user?.screen_name ?? "unknown";
  return {
    tweetId,
    mediaIndex: index,
    mediaType: detail.type as TweetMedia["mediaType"],
    mp4Url,
    tweetUrl: `https://x.com/${handle}/status/${tweetId}`,
    authorHandle: handle,
    authorName: tweet.user?.name ?? handle,
    text: (tweet.text ?? "").replace(/\s*https:\/\/t\.co\/\w+\s*$/, ""),
    likes: tweet.favorite_count ?? 0,
    retweets: tweet.retweet_count ?? 0,
    width: detail.original_info?.width ?? 0,
    height: detail.original_info?.height ?? 0,
    durationMs: detail.video_info?.duration_millis ?? 0,
    sensitive: tweet.possibly_sensitive === true,
  };
}

type YtDlpInfo = {
  url?: string;
  uploader_id?: string;
  uploader?: string;
  description?: string;
  like_count?: number;
  repost_count?: number;
  width?: number;
  height?: number;
  duration?: number;
  age_limit?: number;
};

async function fromYtDlp(tweetId: string, mediaSlot: number | null): Promise<TweetMedia> {
  // yt-dlp runs in the media processor; loaded lazily so URL parsing stays dependency-free.
  const { ytdlpInfo } = await import("@/lib/media/processor");
  const info = (await ytdlpInfo(tweetId, (mediaSlot ?? 0) + 1)) as YtDlpInfo;
  if (!info.url) throw new GrabError("That post has no GIF or video in it.", 422);
  const handle = info.uploader_id ?? "unknown";
  return {
    tweetId,
    mediaIndex: mediaSlot ?? 0,
    mediaType: "video",
    mp4Url: info.url,
    tweetUrl: `https://x.com/${handle}/status/${tweetId}`,
    authorHandle: handle,
    authorName: info.uploader ?? handle,
    text: info.description ?? "",
    likes: info.like_count ?? 0,
    retweets: info.repost_count ?? 0,
    width: info.width ?? 0,
    height: info.height ?? 0,
    durationMs: Math.round((info.duration ?? 0) * 1000),
    sensitive: (info.age_limit ?? 0) >= 18,
  };
}

/** Resolve an X post link to its GIF/video MP4 and post metadata. */
export async function fetchTweetMedia(input: string): Promise<TweetMedia> {
  const { tweetId, mediaSlot } = parseTweetUrl(input);
  let media: TweetMedia;
  try {
    media = await fromSyndication(tweetId, mediaSlot);
  } catch (err) {
    if (err instanceof GrabError) throw err;
    console.warn(`[grab] syndication failed for ${tweetId}, trying yt-dlp:`, err);
    try {
      media = await fromYtDlp(tweetId, mediaSlot);
    } catch (err2) {
      if (err2 instanceof GrabError) throw err2;
      console.error(`[grab] yt-dlp failed for ${tweetId}:`, err2);
      throw new GrabError("Couldn't get media from X right now. Try again in a minute.", 502);
    }
  }
  if (!mediaHosts().includes(new URL(media.mp4Url).host)) {
    throw new GrabError("Unexpected media host from X.", 502);
  }
  return media;
}

/**
 * Link that makes X embed this post's GIF inside a new post, credited "From @author".
 * X numbers media slots from 1 in these links.
 */
export function originalMediaUrl(authorHandle: string, tweetId: string, mediaIndex: number): string {
  return `https://x.com/${authorHandle}/status/${tweetId}/video/${mediaIndex + 1}`;
}

const originCache = new Map<string, { available: boolean | null; expires: number }>();

/**
 * Is the post's GIF still live on X? `null` means X couldn't be reached.
 * Cached so that repeated shares of the same GIF don't each hit X.
 */
export async function isOriginalAvailable(tweetId: string, mediaIndex: number): Promise<boolean | null> {
  const key = `${tweetId}:${mediaIndex}`;
  const hit = originCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.available;

  let available: boolean | null;
  try {
    available = (await fromSyndication(tweetId, mediaIndex)).mediaIndex === mediaIndex;
  } catch (err) {
    available = err instanceof GrabError ? false : null;
  }
  const ttl = available === null ? 2 * 60_000 : 30 * 60_000;
  originCache.set(key, { available, expires: Date.now() + ttl });
  return available;
}
