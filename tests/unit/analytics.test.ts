import { describe, expect, it } from "vitest";
import { dataPoint, deviceOf, siteOf } from "@/lib/analytics";

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
