import { describe, expect, it } from "vitest";
import { extractLink, linkKey, normalizeLink, siteName } from "@/lib/links";
import { isXLink } from "@/lib/x/fetchTweetMedia";
import { normalizeArgs, sniffMedia, ytdlpDownloadArgs, ytdlpFailure } from "../../processor/presets.mjs";

describe("isXLink", () => {
  it.each([
    ["https://x.com/a/status/1", true],
    ["look: https://twitter.com/a/status/1", true],
    ["https://x.com/someone", true],
    ["https://t.co/abc", true],
    ["https://giphy.com/gifs/cat-123", false],
    ["https://evilx.com/a/status/1", false],
    ["not a link", false],
  ])("%s → %s", (input, expected) => {
    expect(isXLink(input)).toBe(expected);
  });
});

describe("extractLink", () => {
  it.each([
    ["https://giphy.com/gifs/cat-123", "https://giphy.com/gifs/cat-123"],
    ["giphy.com/gifs/cat-123", "https://giphy.com/gifs/cat-123"],
    ["check this https://i.imgur.com/abc.gif.", "https://i.imgur.com/abc.gif"],
    ['"https://tenor.com/view/x-1"', "https://tenor.com/view/x-1"],
  ])("%s → %s", (input, href) => {
    expect(extractLink(input)?.href).toBe(href);
  });

  it("finds nothing in plain text or non-web schemes", () => {
    expect(extractLink("not a link")).toBeNull();
    expect(extractLink("ftp://example.com/cat.gif")).toBeNull();
  });
});

describe("normalizeLink and linkKey", () => {
  const key = (s: string) => linkKey(new URL(s));

  it("treats tracking parameters, www, http, fragments and trailing slashes as the same link", () => {
    const base = key("https://giphy.com/gifs/cat-123");
    expect(key("http://www.giphy.com/gifs/cat-123/?utm_source=x&s=20#top")).toBe(base);
    expect(key("https://m.giphy.com/gifs/cat-123?fbclid=abc")).toBe(base);
  });

  it("keeps parameters that change what the link points at", () => {
    expect(key("https://site.com/v?id=1")).not.toBe(key("https://site.com/v?id=2"));
    expect(normalizeLink(new URL("https://site.com/v?b=2&a=1"))).toBe("https://site.com/v?a=1&b=2");
  });

  it("looks like url:<24 hex>", () => {
    expect(key("https://giphy.com/gifs/cat-123")).toMatch(/^url:[0-9a-f]{24}$/);
  });
});

describe("siteName", () => {
  it.each([
    ["https://media.giphy.com/media/abc/giphy.gif", "giphy.com"],
    ["https://v.redd.it/abc", "redd.it"],
    ["https://www.reddit.com/r/gifs/comments/1", "reddit.com"],
    ["https://i.imgur.com/abc.gif", "imgur.com"],
  ])("%s → %s", (input, site) => {
    expect(siteName(new URL(input))).toBe(site);
  });
});

describe("processor helpers for links", () => {
  const bytes = (s: string, prefix: number[] = []) => new Uint8Array([...prefix, ...Buffer.from(s)]);

  it("sniffs GIF, WebP, MP4 and WebM from their first bytes", () => {
    expect(sniffMedia(bytes("GIF89a......."))).toBe("gif");
    expect(sniffMedia(bytes("RIFF\0\0\0\0WEBPVP8X"))).toBe("webp");
    expect(sniffMedia(bytes("\0\0\0\x18ftypmp42"))).toBe("mov");
    expect(sniffMedia(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]))).toBe("matroska");
    expect(sniffMedia(bytes("<html><body>"))).toBeNull();
  });

  it("normalises to H.264 MP4 from a local file only, keeping audio if there is any", () => {
    const args = normalizeArgs("gif", "/tmp/in", "/tmp/out.mp4").join(" ");
    expect(args).toMatch(/^-protocol_whitelist file -f gif -i \/tmp\/in/);
    expect(args).toContain("-map 0:a:0?");
    expect(args).toContain("-c:v libx264");
    expect(args).toContain("+faststart -f mp4 /tmp/out.mp4");
  });

  it("asks yt-dlp for one item, size-capped, merged to MP4, with the link after --", () => {
    const args = ytdlpDownloadArgs("https://giphy.com/gifs/x", "/tmp/dl.%(ext)s", 1000);
    expect(args).toContain("--no-playlist");
    expect(args.slice(args.indexOf("--max-filesize"), args.indexOf("--max-filesize") + 2)).toEqual(["--max-filesize", "1000"]);
    expect(args.slice(-2)).toEqual(["--", "https://giphy.com/gifs/x"]);
  });

  it.each([
    ["ERROR: Unsupported URL: https://a.com", 422],
    ["ERROR: File is larger than max-filesize", 413],
    ["ERROR: Unable to download webpage: HTTP Error 404: Not Found", 404],
    ["ERROR: This video is private. Sign in to view", 403],
    ["ERROR: Unable to download webpage: <urlopen error timed out>", 502],
  ])("explains %s as %s", (stderr, status) => {
    expect(ytdlpFailure(stderr).status).toBe(status);
  });
});
