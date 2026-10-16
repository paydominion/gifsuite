import { describe, expect, it, vi } from "vitest";
import { BREAKER, deduper, isPaused, limiter, nextHealth, withRetry, type Health } from "@/lib/x/resilience";

const fresh: Health = { failures: 0, windowStart: 0, pausedUntil: 0, lastOk: null, lastError: null };
const fail = { ok: false as const, error: "HTTP 500" };

describe("circuit breaker", () => {
  it("pauses after 5 failures within the window, for a minute", () => {
    let h = fresh;
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) h = nextHealth(h, fail, t0 + i * 1000);
    expect(isPaused(h, t0 + 4000)).toBe(false);
    h = nextHealth(h, fail, t0 + 5000);
    expect(h.failures).toBe(5);
    expect(isPaused(h, t0 + 5000)).toBe(true);
    expect(isPaused(h, t0 + 5000 + BREAKER.pauseMs + 1)).toBe(false);
  });

  it("starts counting again after the window passes", () => {
    let h = fresh;
    for (let i = 0; i < 4; i++) h = nextHealth(h, fail, 1000 + i);
    h = nextHealth(h, fail, 1000 + BREAKER.windowMs + 10);
    expect(h.failures).toBe(1);
    expect(isPaused(h, 1000 + BREAKER.windowMs + 10)).toBe(false);
  });

  it("a success clears failures and any pause", () => {
    let h = fresh;
    for (let i = 0; i < 5; i++) h = nextHealth(h, fail, 1000 + i);
    h = nextHealth(h, { ok: true }, 2000);
    expect(h).toMatchObject({ failures: 0, pausedUntil: 0, lastOk: 2000 });
  });

  it("uses a custom failure limit", () => {
    expect(isPaused(nextHealth(fresh, fail, 1000, 1), 1000)).toBe(true);
  });
});

describe("withRetry", () => {
  const noSleep = () => Promise.resolve();

  it("retries until it works", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      if (++calls < 3) throw new Error("flaky");
      return "ok";
    }, { sleep: noSleep });
    expect([result, calls]).toEqual(["ok", 3]);
  });

  it("gives up after the last attempt, and never retries what it shouldn't", async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error("down"); }, { attempts: 3, sleep: noSleep })).rejects.toThrow("down");
    expect(calls).toBe(3);
    calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error("not found"); }, { retryable: () => false, sleep: noSleep })).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("waits longer each time, with a little randomness", async () => {
    const waits: number[] = [];
    await withRetry(async () => { throw new Error("x"); }, { attempts: 4, baseMs: 100, sleep: async (ms) => waits.push(ms) }).catch(() => {});
    expect(waits).toHaveLength(3);
    expect(waits[0]).toBeGreaterThanOrEqual(75);
    expect(waits[0]).toBeLessThanOrEqual(125);
    expect(waits[2]).toBeGreaterThanOrEqual(300);
    expect(waits[2]).toBeLessThanOrEqual(500);
  });
});

describe("limiter and deduper", () => {
  it("runs at most N at once", async () => {
    const limit = limiter(2);
    let active = 0;
    let peak = 0;
    const job = () => limit(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    await Promise.all(Array.from({ length: 6 }, job));
    expect(peak).toBe(2);
  });

  it("makes one call for simultaneous requests of the same key, and a new one afterwards", async () => {
    const once = deduper<number>();
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 42;
    });
    expect(await Promise.all([once("a", fn), once("a", fn), once("a", fn)])).toEqual([42, 42, 42]);
    expect(fn).toHaveBeenCalledTimes(1);
    await once("a", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
