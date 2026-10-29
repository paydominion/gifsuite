import "server-only";
import { bindings } from "@/lib/cloudflare";

export type Gif = {
  id: string;
  /** Where it came from: "x", or another site's name ("giphy.com"). */
  source: string;
  tweetId: string;
  mediaIndex: number;
  mediaType: string;
  sourceUrl: string;
  tweetUrl: string;
  authorHandle: string;
  authorName: string;
  tweetText: string;
  tweetLikes: number;
  tweetRetweets: number;
  width: number;
  height: number;
  durationMs: number;
  hasAudio: boolean;
  createdAt: number;
  hidden: boolean;
  tags: string[];
  aiCaption: string | null;
  /** On the public timeline. Private GIFs are left off it, but anyone with the link can open them. */
  isPublic: boolean;
  /** true = sensitive (shown blurred, never on the timeline), false = safe, null = not checked. */
  nsfw: boolean | null;
};

/** How a GIF's NSFW verdict was reached; stored with the GIF. */
export type NsfwVerdict = { nsfw: boolean | null; score: number | null; source: "x" | "site" | "scan" | "admin" | null };

export type EventType = "grab" | "view" | "download" | "share" | "report";

const COLUMNS = `
  id, source, tweet_id AS tweetId, media_index AS mediaIndex, media_type AS mediaType,
  source_url AS sourceUrl, tweet_url AS tweetUrl, author_handle AS authorHandle,
  author_name AS authorName, tweet_text AS tweetText, tweet_likes AS tweetLikes,
  tweet_retweets AS tweetRetweets, width, height, duration_ms AS durationMs,
  has_audio AS hasAudio, created_at AS createdAt, hidden, tags, ai_caption AS aiCaption,
  is_public AS isPublic, nsfw`;

const db = () => bindings().DB;

/**
 * Private grabs are stored under a key scoped to the grabbing browser, "p:<owner>:<key>", so a
 * stranger grabbing the same link gets their own copy instead of finding someone's private GIF.
 */
export const privateGrabKey = (key: string, ownerKeyHash: string) => `p:${ownerKeyHash.slice(0, 16)}:${key}`;
const unscopedKey = (key: string) => key.replace(/^p:[0-9a-f]{16}:/, "");

function toGif(row: Record<string, unknown> | null): Gif | null {
  if (!row) return null;
  return {
    ...(row as Omit<Gif, "hasAudio" | "hidden" | "tags" | "isPublic" | "nsfw">),
    tweetId: unscopedKey(row.tweetId as string),
    hasAudio: row.hasAudio === 1,
    hidden: row.hidden === 1,
    isPublic: row.isPublic === 1,
    nsfw: row.nsfw === null || row.nsfw === undefined ? null : row.nsfw === 1,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
  };
}

export function newGifId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function getGif(id: string): Promise<Gif | null> {
  return toGif(await db().prepare(`SELECT ${COLUMNS} FROM gifs WHERE id = ?`).bind(id).first());
}

/** The GIF stored under this key, and the hash of the browser that grabbed it. */
export async function findGifByTweet(tweetId: string, mediaIndex: number): Promise<{ gif: Gif; ownerKeyHash: string | null } | null> {
  const row = await db()
    .prepare(`SELECT ${COLUMNS}, owner_key_hash AS ownerKeyHash FROM gifs WHERE tweet_id = ? AND media_index = ?`)
    .bind(tweetId, mediaIndex)
    .first<Record<string, unknown>>();
  if (!row) return null;
  const { ownerKeyHash, ...rest } = row;
  return { gif: toGif(rest)!, ownerKeyHash: (ownerKeyHash as string | null) ?? null };
}

/**
 * Newest-first public timeline: only GIFs that are public, checked safe, and not taken down.
 * `before` is the createdAt cursor of the last item seen.
 */
export async function listGifs(limit: number, before?: number): Promise<Gif[]> {
  const { results } = await db()
    .prepare(
      `SELECT ${COLUMNS} FROM gifs WHERE hidden = 0 AND is_public = 1 AND nsfw = 0 AND created_at < ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(before ?? Number.MAX_SAFE_INTEGER, limit)
    .all<Record<string, unknown>>();
  return results.map((r) => toGif(r)!);
}

export type NewGif = Omit<Gif, "createdAt" | "hidden" | "tags" | "aiCaption" | "nsfw"> & {
  ownerKeyHash: string | null;
  verdict: NsfwVerdict;
};

const flag = (b: boolean | null) => (b === null ? null : b ? 1 : 0);

export async function insertGif(g: NewGif): Promise<Gif> {
  await db()
    .prepare(
      `INSERT INTO gifs (id, source, tweet_id, media_index, media_type, source_url, tweet_url,
         author_handle, author_name, tweet_text, tweet_likes, tweet_retweets,
         width, height, duration_ms, has_audio, created_at,
         is_public, owner_key_hash, nsfw, nsfw_score, nsfw_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      g.id, g.source, g.tweetId, g.mediaIndex, g.mediaType, g.sourceUrl, g.tweetUrl,
      g.authorHandle, g.authorName, g.tweetText, g.tweetLikes, g.tweetRetweets,
      g.width, g.height, g.durationMs, g.hasAudio ? 1 : 0, Date.now(),
      g.isPublic ? 1 : 0, g.ownerKeyHash, flag(g.verdict.nsfw), g.verdict.score, g.verdict.source,
    )
    .run();
  return (await getGif(g.id))!;
}

/** True if `ownerKeyHash` is the browser that grabbed this GIF. */
export async function isOwner(id: string, ownerKeyHash: string | null): Promise<boolean> {
  if (!ownerKeyHash) return false;
  const row = await db().prepare(`SELECT owner_key_hash AS h FROM gifs WHERE id = ?`).bind(id).first<{ h: string | null }>();
  return !!row?.h && row.h === ownerKeyHash;
}

export async function setPublic(id: string, isPublic: boolean): Promise<boolean> {
  const { meta } = await db().prepare(`UPDATE gifs SET is_public = ? WHERE id = ?`).bind(isPublic ? 1 : 0, id).run();
  return meta.changes > 0;
}

/** An admin's call overrides the scanner, e.g. to clear a false positive. */
export async function setNsfw(id: string, nsfw: boolean): Promise<boolean> {
  const { meta } = await db()
    .prepare(`UPDATE gifs SET nsfw = ?, nsfw_source = 'admin' WHERE id = ?`)
    .bind(nsfw ? 1 : 0, id)
    .run();
  return meta.changes > 0;
}

/** Restoring (hidden = false) also marks the reports so far as reviewed: only newer ones count again. */
export async function setHidden(id: string, hidden: boolean): Promise<boolean> {
  const stmt = hidden
    ? db().prepare(`UPDATE gifs SET hidden = 1 WHERE id = ?`).bind(id)
    : db().prepare(`UPDATE gifs SET hidden = 0, reports_reviewed_at = ? WHERE id = ?`).bind(Date.now(), id);
  const { meta } = await stmt.run();
  return meta.changes > 0;
}

export async function recordEvent(gifId: string, type: EventType, detail?: string, visitor?: string) {
  await db()
    .prepare(`INSERT INTO events (gif_id, type, detail, visitor, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(gifId, type, detail ?? null, visitor ?? null, Date.now())
    .run();
}

export async function countDistinctReporters(gifId: string): Promise<number> {
  const row = await db()
    .prepare(
      `SELECT COUNT(DISTINCT e.visitor) AS n FROM events e JOIN gifs g ON g.id = e.gif_id
       WHERE e.gif_id = ? AND e.type = 'report' AND e.created_at > g.reports_reviewed_at`,
    )
    .bind(gifId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Stores the scanner's verdict, unless an admin or X's mark has decided in the meantime. */
export async function saveScanResult(id: string, v: NsfwVerdict): Promise<void> {
  await db()
    .prepare(`UPDATE gifs SET nsfw = ?, nsfw_score = ?, nsfw_source = ? WHERE id = ? AND nsfw IS NULL`)
    .bind(flag(v.nsfw), v.score, v.source, id)
    .run();
}

/** Public GIFs still waiting for their NSFW check, oldest first. */
export async function listUnscanned(limit: number): Promise<string[]> {
  const { results } = await db()
    .prepare(`SELECT id FROM gifs WHERE nsfw IS NULL AND is_public = 1 AND hidden = 0 ORDER BY created_at LIMIT ?`)
    .bind(limit)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}
