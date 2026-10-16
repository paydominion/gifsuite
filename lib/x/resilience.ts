import "server-only";
import { bindings, setting } from "@/lib/cloudflare";

/**
 * Keeping grabs working when X misbehaves:
 *   - withRetry: retries temporary failures with growing, slightly random waits.
 *   - a circuit breaker per source, shared through D1: a run of failures pauses the source briefly,
 *     so grabs use the fallback straight away instead of each waiting on a source that's down.
 *   - limit + dedupe: at most a few requests at once per Worker instance, and one request for the
 *     same post however many people grab it at the same moment.
 */

export type Health = { failures: number; windowStart: number; pausedUntil: number; lastOk: number | null; lastError: string | null };
export const BREAKER = { windowMs: 120_000, pauseMs: 60_000 };
const failureLimit = () => Number(setting("X_BREAKER_FAILURES")) || 5;

/** The breaker's next state after a success or failure. Pure, so it can be tested on its own. */
export function nextHealth(h: Health, event: { ok: true } | { ok: false; error: string }, now: number, limit = 5): Health {
  if (event.ok) return { failures: 0, windowStart: now, pausedUntil: 0, lastOk: now, lastError: h.lastError };
  const fresh = now - h.windowStart > BREAKER.windowMs;
  const failures = fresh ? 1 : h.failures + 1;
  const windowStart = fresh ? now : h.windowStart;
  return { failures, windowStart, pausedUntil: failures >= limit ? now + BREAKER.pauseMs : h.pausedUntil, lastOk: h.lastOk, lastError: event.error.slice(0, 200) };
}

export const isPaused = (h: Health, now: number) => h.pausedUntil > now;

const EMPTY: Health = { failures: 0, windowStart: 0, pausedUntil: 0, lastOk: null, lastError: null };

export async function readHealth(source: string): Promise<Health> {
  try {
    const row = await bindings()
      .DB.prepare(`SELECT failures, window_start AS windowStart, paused_until AS pausedUntil, last_ok AS lastOk, last_error AS lastError FROM source_health WHERE source = ?`)
      .bind(source)
      .first<Health>();
    return row ?? EMPTY;
  } catch {
    return EMPTY; // never block a grab because the health table couldn't be read
  }
}

async function writeHealth(source: string, h: Health) {
  try {
    await bindings()
      .DB.prepare(
        `INSERT INTO source_health (source, failures, window_start, paused_until, last_ok, last_error) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(source) DO UPDATE SET failures = excluded.failures, window_start = excluded.window_start,
           paused_until = excluded.paused_until, last_ok = excluded.last_ok, last_error = excluded.last_error`,
      )
      .bind(source, h.failures, h.windowStart, h.pausedUntil, h.lastOk, h.lastError)
      .run();
  } catch (err) {
    console.warn(`[health] couldn't record ${source} health:`, err);
  }
}

export async function recordResult(source: string, event: { ok: true } | { ok: false; error: string }) {
  const now = Date.now();
  const before = await readHealth(source);
  const after = nextHealth(before, event, now, failureLimit());
  // Successes only need writing when something changes (a pause or failures to clear), to spare D1.
  if (event.ok && before.failures === 0 && before.pausedUntil === 0 && before.lastOk && now - before.lastOk < 60_000) return;
  if (!isPaused(before, now) && isPaused(after, now)) console.warn(`[health] ${source} paused for ${BREAKER.pauseMs / 1000}s after ${after.failures} failures: ${after.lastError}`);
  await writeHealth(source, after);
}

/** Retries `fn` on failures `retryable` accepts, waiting base·2ⁿ (±25%) between attempts. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseMs = 300, retryable = () => true, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)) }:
    { attempts?: number; baseMs?: number; retryable?: (err: unknown) => boolean; sleep?: (ms: number) => Promise<unknown> } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !retryable(err)) throw err;
      const wait = baseMs * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5);
      await sleep(wait);
    }
  }
}

/** At most `max` calls of `fn` at once in this Worker instance; the rest wait their turn. */
export function limiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((r) => waiting.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

/** Shares one in-flight promise per key, so simultaneous requests for the same thing make one call. */
export function deduper<T>() {
  const inFlight = new Map<string, Promise<T>>();
  return (key: string, fn: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) return existing;
    const p = fn().finally(() => inFlight.delete(key));
    inFlight.set(key, p);
    return p;
  };
}
