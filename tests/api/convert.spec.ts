import fs from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { FAKE_X, visitor } from "../helpers";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "tests", ".fixtures", name));

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  gif: (b) => b.subarray(0, 6).toString("latin1") === "GIF89a",
  mp4: (b) => b.subarray(4, 8).toString("latin1") === "ftyp",
  webm: (b) => b.readUInt32BE(0) === 0x1a45dfa3,
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

function upload(request: APIRequestContext, body: Buffer, query: string, headers = visitor()) {
  return request.post(`/api/convert?${query}`, {
    data: body,
    headers: { ...headers, "content-type": "application/octet-stream" },
  });
}

test.describe("POST /api/convert", () => {
  const cases: [string, string, string][] = [
    ["odd.gif", "mp4", "high"],
    ["odd.gif", "webm", "low"],
    ["odd.gif", "webp", "medium"],
    ["clip.webm", "gif", "low"],
    ["clip.webm", "mp4", "medium"],
    ["cat.mp4", "webp", "low"],
    ["cat.mp4", "gif", "high"],
  ];
  for (const [input, format, quality] of cases) {
    test(`${input} → ${quality} ${format}`, async ({ request }) => {
      const res = await upload(request, fixture(input), `format=${format}&quality=${quality}`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-disposition"]).toBe(`attachment; filename="gifsuite-${quality}.${format}"`);
      expect(res.headers()["cache-control"]).toBe("no-store");
      expect(MAGIC[format](await res.body())).toBe(true);
    });
  }

  test("low quality shrinks a large GIF to 320px wide", async ({ request }) => {
    const res = await upload(request, fixture("big.mp4"), "format=gif&quality=low");
    expect((await res.body()).readUInt16LE(6)).toBe(320);
  });

  test("rejects files that aren't GIF, MP4, MOV or WebM, whatever they're named", async ({ request }) => {
    for (const body of [Buffer.from("just some text pretending to be a gif"), Buffer.from("\x89PNG\r\n\x1a\n0000000000")]) {
      const res = await upload(request, body, "format=gif");
      expect(res.status()).toBe(415);
      expect((await res.json()).error).toMatch(/isn't a GIF, MP4, MOV or WebM/);
    }
  });

  test("a hostile playlist upload is rejected and never makes a network request", async ({ request }) => {
    const before = Number(await (await request.get(`${FAKE_X}/__leaks`)).text());
    for (const format of ["gif", "mp4", "webm", "webp"]) {
      expect((await upload(request, fixture("evil.gif"), `format=${format}`)).status()).toBe(415);
    }
    // Even with a real GIF header glued on the front, ffmpeg is locked to reading a GIF from a local file.
    const disguised = Buffer.concat([Buffer.from("GIF89a"), fixture("evil.gif")]);
    expect([415, 422]).toContain((await upload(request, disguised, "format=mp4")).status());
    expect(Number(await (await request.get(`${FAKE_X}/__leaks`)).text())).toBe(before);
  });

  test("rejects empty, oversized and too-long uploads", async ({ request }) => {
    const empty = await upload(request, Buffer.alloc(0), "format=gif");
    expect(empty.status()).toBe(400);

    // The test environment's limit is 3 MB.
    const big = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(3 * 1024 * 1024)]);
    const tooBig = await upload(request, big, "format=gif");
    expect(tooBig.status()).toBe(413);
    expect((await tooBig.json()).error).toMatch(/over 3 MB/);

    const tooLong = await upload(request, fixture("long.mp4"), "format=gif");
    expect(tooLong.status()).toBe(413);
    expect((await tooLong.json()).error).toMatch(/longer than 60s/);
  });

  test("rejects unknown formats and qualities", async ({ request }) => {
    expect((await upload(request, fixture("odd.gif"), "format=exe")).status()).toBe(400);
    expect((await upload(request, fixture("odd.gif"), "format=gif&quality=ultra")).status()).toBe(400);
  });

  test("rate-limits one visitor to 20 uploads a minute", async ({ request }) => {
    const me = visitor();
    for (let i = 0; i < 20; i++) expect((await upload(request, Buffer.alloc(0), "format=gif", me)).status()).toBe(400);
    expect((await upload(request, Buffer.alloc(0), "format=gif", me)).status()).toBe(429);
  });
});
