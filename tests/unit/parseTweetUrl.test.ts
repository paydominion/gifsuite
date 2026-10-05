import { describe, expect, it } from "vitest";
import { GrabError, originalMediaUrl, parseTweetUrl, syndicationToken } from "@/lib/x/fetchTweetMedia";

describe("parseTweetUrl", () => {
  it.each([
    ["https://x.com/TioGordol4/status/2097383122283229315/video/1?s=46", "2097383122283229315", 0],
    ["https://twitter.com/a/status/123456", "123456", null],
    ["https://mobile.twitter.com/a/status/123456?s=20", "123456", null],
    ["https://www.x.com/a/status/123456/photo/2", "123456", 1],
    ["https://fxtwitter.com/a/status/123456", "123456", null],
    ["https://x.com/a/statuses/123456", "123456", null],
    ["x.com/a/status/123456", "123456", null],
    ["  https://x.com/a/status/123456  ", "123456", null],
    ["https://x.com/jack/status/20", "20", null],
    // Links pasted with other text around them, as chat apps and notes often copy them.
    ['"https://x.com/a/status/123456?s=20"', "123456", null],
    ["@https://x.com/a/status/123456", "123456", null],
    ["<https://x.com/a/status/123456>", "123456", null],
    ["use this....https://x.com/a/status/123456?s=20", "123456", null],
    ["look at this https://twitter.com/a/status/123456/video/2 lol", "123456", 1],
    ["(x.com/a/status/123456)", "123456", null],
    // Only the post ID is ever sent to X, so a post link wrapped in another link is safe to use.
    ["https://example.com/?u=https://x.com/a/status/123456", "123456", null],
  ])("reads %s", (input, tweetId, mediaSlot) => {
    expect(parseTweetUrl(input)).toEqual({ tweetId, mediaSlot });
  });

  it.each([
    ["not a link", /doesn't look like a link/],
    ["https://youtube.com/watch?v=1", /Only X/],
    ["https://evilx.com/a/status/123", /Only X/],
    ["https://x.com.evil.com/a/status/123", /Only X/],
    ["https://x.com/someone", /Couldn't find a post/],
    ["https://t.co/AbCdEf123", /shortened t\.co link/],
    ["see t.co/AbCdEf123", /shortened t\.co link/],
    // Lookalike hosts stay rejected even inside other text.
    ["see https://evilx.com/a/status/123", /Only X/],
    ["see https://x.com.evil.com/a/status/123", /Only X/],
    ["have a look: https://youtube.com/watch?v=1", /Only X/],
  ])("rejects %s", (input, message) => {
    expect(() => parseTweetUrl(input)).toThrow(GrabError);
    expect(() => parseTweetUrl(input)).toThrow(message);
  });
});

describe("syndicationToken", () => {
  it("is deterministic and alphanumeric", () => {
    const token = syndicationToken("2097383122283229315");
    expect(token).toBe(syndicationToken("2097383122283229315"));
    expect(token).toMatch(/^[a-z0-9]+$/);
  });
});

describe("originalMediaUrl", () => {
  it("numbers media slots from 1", () => {
    expect(originalMediaUrl("someone", "123", 0)).toBe("https://x.com/someone/status/123/video/1");
    expect(originalMediaUrl("someone", "123", 1)).toBe("https://x.com/someone/status/123/video/2");
  });
});
