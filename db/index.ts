import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, MEDIA_DIR } from "@/lib/paths";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gifs (
  id             TEXT PRIMARY KEY,
  tweet_id       TEXT NOT NULL,
  media_index    INTEGER NOT NULL,
  media_type     TEXT NOT NULL,
  source_url     TEXT NOT NULL,
  tweet_url      TEXT NOT NULL,
  author_handle  TEXT NOT NULL,
  author_name    TEXT NOT NULL,
  tweet_text     TEXT NOT NULL DEFAULT '',
  tweet_likes    INTEGER NOT NULL DEFAULT 0,
  tweet_retweets INTEGER NOT NULL DEFAULT 0,
  width          INTEGER NOT NULL,
  height         INTEGER NOT NULL,
  duration_ms    INTEGER NOT NULL,
  has_audio      INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  hidden         INTEGER NOT NULL DEFAULT 0,
  tags           TEXT,
  ai_caption     TEXT,
  UNIQUE (tweet_id, media_index)
);
CREATE INDEX IF NOT EXISTS gifs_timeline ON gifs (hidden, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  gif_id     TEXT NOT NULL REFERENCES gifs(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  detail     TEXT,
  visitor    TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_gif_type ON events (gif_id, type);
CREATE INDEX IF NOT EXISTS events_created ON events (created_at);
`;

declare global {
  var __gifsuiteDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "gifsuite.db"));
  db.exec(SCHEMA);
  return db;
}

// Reuse one connection across dev hot reloads.
export const db: DatabaseSync = (globalThis.__gifsuiteDb ??= open());
