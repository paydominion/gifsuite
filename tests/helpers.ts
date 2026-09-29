import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

export const FAKE_X = "http://127.0.0.1:3298";
export const ADMIN_TOKEN = "test-admin-token-not-a-real-secret";

/** Headers that make a request look like a new visitor, so rate limits and report counts don't leak between tests. */
export function visitor(): Record<string, string> {
  const n = () => Math.floor(Math.random() * 250) + 1;
  const ip = `10.${n()}.${n()}.${n()}`;
  return { "x-forwarded-for": ip, "user-agent": `gifsuite-test ${ip}` };
}

export async function grab(request: APIRequestContext, url: string, headers = visitor()) {
  const res = await request.post("/api/grab", { data: { url }, headers });
  return { status: res.status(), body: await res.json() };
}

export async function grabId(request: APIRequestContext, tweetId: string, handle = "someone"): Promise<string> {
  const { status, body } = await grab(request, `https://x.com/${handle}/status/${tweetId}`);
  if (status !== 200) throw new Error(`grab ${tweetId} failed: ${status} ${JSON.stringify(body)}`);
  return body.id;
}

export async function deleteOnFakeX(request: APIRequestContext, tweetId: string) {
  await request.post(`${FAKE_X}/__delete?id=${tweetId}`);
}

/** Read-only look at the test server's database, for checking what got recorded. */
export function testDb(): DatabaseSync {
  return new DatabaseSync(path.join(process.cwd(), ".test-data", "gifsuite.db"), { readOnly: true });
}

export function countEvents(gifId: string, type: string, detail?: string): number {
  const db = testDb();
  try {
    const row = detail
      ? db.prepare("SELECT COUNT(*) AS n FROM events WHERE gif_id = ? AND type = ? AND detail = ?").get(gifId, type, detail)
      : db.prepare("SELECT COUNT(*) AS n FROM events WHERE gif_id = ? AND type = ?").get(gifId, type);
    return (row as { n: number }).n;
  } finally {
    db.close();
  }
}
