import { describe, expect, it } from "vitest";
import { parseRange } from "@/lib/http-range";
import { afterEach, vi } from "vitest";
import { clientIp, rateLimit, safeEqual, visitorHash } from "@/lib/request";

describe("parseRange", () => {
  it.each([
    [null, null],
    ["", null],
    ["bytes=-", null],
    ["items=0-1", null],
    ["bytes=0-99", { start: 0, end: 99 }],
    ["bytes=100-", { start: 100, end: 999 }],
    ["bytes=-100", { start: 900, end: 999 }],
    ["bytes=900-5000", { start: 900, end: 999 }],
    ["bytes=-5000", { start: 0, end: 999 }],
    ["bytes=1000-", "unsatisfiable"],
    ["bytes=50-10", "unsatisfiable"],
  ])("%s", (header, expected) => {
    expect(parseRange(header, 1000)).toEqual(expected);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit, then blocks, per key", () => {
    const key = `unit-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
    expect(rateLimit(`${key}-other`, 3, 60_000)).toBe(true);
  });
});

describe("visitorHash", () => {
  const req = (ip: string, ua = "ua") =>
    new Request("http://x/", { headers: { "cf-connecting-ip": ip, "user-agent": ua } });

  it("is stable for the same visitor and never contains the IP", () => {
    const hash = visitorHash(req("203.0.113.7"));
    expect(hash).toBe(visitorHash(req("203.0.113.7")));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toContain("203");
  });

  it("differs between visitors", () => {
    expect(visitorHash(req("203.0.113.7"))).not.toBe(visitorHash(req("203.0.113.8")));
    expect(visitorHash(req("203.0.113.7", "a"))).not.toBe(visitorHash(req("203.0.113.7", "b")));
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://x/", { headers });
  afterEach(() => vi.unstubAllEnvs());

  it("uses Cloudflare's connecting IP", () => {
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4" }))).toBe("203.0.113.7");
  });

  it("ignores x-forwarded-for by default, because anyone can fake it", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("unknown");
  });

  it("trusts x-forwarded-for only when told to", () => {
    vi.stubEnv("TRUST_FORWARDED_FOR", "1");
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
});

describe("safeEqual", () => {
  it("compares exactly", () => {
    expect(safeEqual("a-long-admin-token", "a-long-admin-token")).toBe(true);
    expect(safeEqual("a-long-admin-token", "a-long-admin-tokeN")).toBe(false);
    expect(safeEqual("short", "a-long-admin-token")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
