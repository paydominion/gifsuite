import "server-only";
import crypto from "node:crypto";
import { db } from "./index";

export type Gif = {
  id: string;
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
};

export type EventType = "grab" | "view" | "download" | "share" | "report";

const COLUMNS = `
  id, tweet_id AS tweetId, media_index AS mediaIndex, media_type AS mediaType,
  source_url AS sourceUrl, tweet_url AS tweetUrl, author_handle AS authorHandle,
  author_name AS authorName, tweet_text AS tweetText, tweet_likes AS tweetLikes,
  tweet_retweets AS tweetRetweets, width, height, duration_ms AS durationMs,
  has_audio AS hasAudio, created_at AS createdAt, hidden, tags, ai_caption AS aiCaption`;

function toGif(row: Record<string, unknown> | undefined): Gif | null {
  if (!row) return null;
  return {
    ...(row as Omit<Gif, "hasAudio" | "hidden" | "tags">),
    hasAudio: row.hasAudio === 1,
    hidden: row.hidden === 1,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
  };
}

export function newGifId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function getGif(id: string): Gif | null {
  return toGif(db.prepare(`SELECT ${COLUMNS} FROM gifs WHERE id = ?`).get(id));
}

export function findGifByTweet(tweetId: string, mediaIndex: number): Gif | null {
  return toGif(
    db
      .prepare(`SELECT ${COLUMNS} FROM gifs WHERE tweet_id = ? AND media_index = ?`)
      .get(tweetId, mediaIndex),
  );
}

/** Newest-first public timeline. `before` is the createdAt cursor of the last item seen. */
export function listGifs(limit: number, before?: number): Gif[] {
  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM gifs WHERE hidden = 0 AND created_at < ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(before ?? Number.MAX_SAFE_INTEGER, limit);
  return rows.map((r: Record<string, unknown>) => toGif(r)!);
}

export type NewGif = Omit<Gif, "createdAt" | "hidden" | "tags" | "aiCaption">;

export function insertGif(g: NewGif): Gif {
  db.prepare(
    `INSERT INTO gifs (id, tweet_id, media_index, media_type, source_url, tweet_url,
       author_handle, author_name, tweet_text, tweet_likes, tweet_retweets,
       width, height, duration_ms, has_audio, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    g.id, g.tweetId, g.mediaIndex, g.mediaType, g.sourceUrl, g.tweetUrl,
    g.authorHandle, g.authorName, g.tweetText, g.tweetLikes, g.tweetRetweets,
    g.width, g.height, g.durationMs, g.hasAudio ? 1 : 0, Date.now(),
  );
  return getGif(g.id)!;
}

export function setHidden(id: string, hidden: boolean): boolean {
  return db.prepare(`UPDATE gifs SET hidden = ? WHERE id = ?`).run(hidden ? 1 : 0, id).changes > 0;
}

export function recordEvent(gifId: string, type: EventType, detail?: string, visitor?: string) {
  db.prepare(
    `INSERT INTO events (gif_id, type, detail, visitor, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(gifId, type, detail ?? null, visitor ?? null, Date.now());
}

export function countDistinctReporters(gifId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT visitor) AS n FROM events WHERE gif_id = ? AND type = 'report'`,
    )
    .get(gifId) as { n: number };
  return row.n;
}
