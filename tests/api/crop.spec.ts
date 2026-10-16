import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { visitor } from "../helpers";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "tests", ".fixtures", name));

const crop = (request: APIRequestContext, name: string, q: string) =>
  request.post(`/api/crop?${q}`, { data: fixture(name), headers: { ...visitor(), "content-type": "application/octet-stream" } });

function size(body: Buffer, ext: string) {
  const f = path.join(os.tmpdir(), `crop-${Date.now()}-${Math.random()}.${ext}`);
  fs.writeFileSync(f, body);
  try {
    return execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", f]).toString().trim();
  } finally {
    fs.rmSync(f, { force: true });
  }
}

test.describe("POST /api/crop", () => {
  test("crops a GIF to a square, still a GIF", async ({ request }) => {
    const res = await crop(request, "odd.gif", "format=gif&x=50&y=0&w=201&h=201");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/gif");
    expect(res.headers()["content-disposition"]).toContain("gifsuite-cropped.gif");
    expect(size(await res.body(), "gif")).toBe("201,201");
  });

  test("crops a video to 9:16 MP4, rounding to even sizes", async ({ request }) => {
    const res = await crop(request, "big.mp4", "format=mp4&x=185&y=0&w=271&h=480");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("video/mp4");
    expect(size(await res.body(), "mp4")).toBe("270,480");
  });

  test("crops a WebM into a GIF", async ({ request }) => {
    const res = await crop(request, "clip.webm", "format=gif&x=0&y=0&w=160&h=120");
    expect(res.status()).toBe(200);
    expect(size(await res.body(), "gif")).toBe("160,120");
  });

  test("explains a box or format that doesn't work", async ({ request }) => {
    const outside = await crop(request, "odd.gif", "format=gif&x=200&y=0&w=200&h=100");
    expect(outside.status()).toBe(400);
    expect((await outside.json()).error).toMatch(/doesn't fit the picture/);

    const noBox = await crop(request, "odd.gif", "format=gif");
    expect(noBox.status()).toBe(400);
    expect((await noBox.json()).error).toMatch(/Draw a crop box/);

    const webm = await crop(request, "odd.gif", "format=webm&x=0&y=0&w=100&h=100");
    expect(webm.status()).toBe(400);

    const notMedia = await request.post("/api/crop?format=gif&x=0&y=0&w=100&h=100", {
      data: Buffer.from("not a video at all, just text"), headers: { ...visitor(), "content-type": "application/octet-stream" },
    });
    expect(notMedia.status()).toBe(415);
  });
});
