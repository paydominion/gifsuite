import { describe, expect, it } from "vitest";
import { dataPoint, deviceOf, siteOf } from "@/lib/analytics";
import { crawlerOf, isPageView, visitSource, visitorId } from "@/lib/analytics-core";

describe("dataPoint", () => {
  const ctx = { country: "NG", visitor: "abc123", device: "ios" };

  it("keeps the fixed column layout that queries rely on", () => {
    expect(
      dataPoint(
        "download",
        { gifId: "AbCdEfGhJk", detail: "gif:low", outcome: "ok", source: "x", status: 200, durationMs: 812.4, bytesIn: 0, bytesOut: 5000, score: 0 },
        ctx,
      ),
    ).toEqual({
      indexes: ["download"],
      blobs: ["download", "AbCdEfGhJk", "gif:low", "ok", "x", "NG", "abc123", "ios"],
      doubles: [200, 812, 0, 5000, 0],
    });
  });

  it("fills missing fields so columns never shift", () => {
    const point = dataPoint("view", {}, ctx);
    expect(point.blobs).toHaveLength(8);
    expect(point.doubles).toEqual([0, 0, 0, 0, 0]);
    expect(point.blobs![3]).toBe("ok");
  });

  it("caps long text", () => {
    expect((dataPoint("grab", { detail: "x".repeat(500) }, ctx).blobs![2] as string).length).toBe(96);
  });
});

describe("siteOf", () => {
  it.each([
    ["https://x.com/a/status/1", "x.com"],
    ["https://www.sex.com/en/gifs/764087?utm_source=direct", "sex.com"],
    ["giphy.com/gifs/cat-123", "giphy.com"],
    ["look: https://media.giphy.com/media/abc/giphy.gif", "media.giphy.com"],
    ["https://mobile.twitter.com/a/status/1", "twitter.com"],
    ['"https://tenor.com/view/x"', "tenor.com"],
    ["not a link", "none"],
  ])("%s → %s", (input, site) => {
    expect(siteOf(input)).toBe(site);
  });
});

describe("deviceOf", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "ios"],
    ["Mozilla/5.0 (Linux; Android 15; Pixel 9)", "android"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)", "desktop"],
    ["Mozilla/5.0 (compatible; Discordbot/2.0)", "bot"],
    [null, "unknown"],
  ])("%s → %s", (ua, device) => {
    expect(deviceOf(ua)).toBe(device);
  });
});

describe("page views", () => {
  const url = new URL("https://gifsuite.com/tools/convert");
  const get = (headers: Record<string, string>, u = url) => isPageView(new Request(u, { headers }), u);

  it("counts full page loads, in-site clicks and crawlers", () => {
    expect(get({ accept: "text/html,application/xhtml+xml" })).toBe(true);
    expect(get({ rsc: "1" })).toBe(true);
    expect(get({ "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" })).toBe(true);
    const sitemap = new URL("https://gifsuite.com/sitemap.xml");
    expect(get({}, sitemap)).toBe(true);
  });

  it("skips prefetches, API calls, media and files", () => {
    expect(get({ rsc: "1", "next-router-prefetch": "1" })).toBe(false);
    expect(get({ accept: "text/html", "sec-purpose": "prefetch" })).toBe(false);
    for (const path of ["/api/gifs", "/media/abc/source.mp4", "/_next/static/x.js", "/brand/og.png", "/icon.svg"]) {
      const u = new URL(`https://gifsuite.com${path}`);
      expect(get({ accept: "text/html" }, u), path).toBe(false);
    }
    expect(isPageView(new Request(url, { method: "POST", headers: { accept: "text/html" } }), url)).toBe(false);
  });

  it.each([
    [null, "direct"],
    ["https://www.google.com/", "google.com"],
    ["https://gifsuite.com/tools", "internal"],
    ["https://l.facebook.com/l.php?u=x", "facebook.com"],
    ["not a url", "direct"],
  ])("referrer %s → %s", (referrer, source) => {
    expect(visitSource(url, referrer)).toBe(source);
  });

  it("prefers utm_source", () => {
    expect(visitSource(new URL("https://gifsuite.com/?utm_source=ProductHunt"), "https://www.producthunt.com/")).toBe("producthunt");
  });

  it("names crawlers", () => {
    expect(crawlerOf("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe("google");
    expect(crawlerOf("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe("bing");
    expect(crawlerOf("SomeBot/1.0")).toBe("other");
  });

  it("makes a stable, anonymous per-day visitor id", () => {
    const a = visitorId("1.2.3.4", "ua", "salt");
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(visitorId("1.2.3.4", "ua", "salt")).toBe(a);
    expect(visitorId("1.2.3.5", "ua", "salt")).not.toBe(a);
    expect(a).not.toContain("1.2.3.4");
  });
});
