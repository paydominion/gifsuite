import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { visitor } from "../helpers";

const fixture = (name: string) => path.join(process.cwd(), "tests", ".fixtures", name);

async function make(request: APIRequestContext, names: string[], settings: object) {
  // Repeated "image" fields, in order, so the form is built with FormData.
  const form = new FormData();
  for (const n of names) form.append("image", new Blob([fs.readFileSync(fixture(n))]), n);
  form.append("settings", JSON.stringify(settings));
  return request.post("/api/make", { multipart: form, headers: visitor() });
}

/** Width, height and duration of a result, read with ffprobe. */
function probe(body: Buffer, ext: string) {
  const f = path.join(os.tmpdir(), `make-${Date.now()}-${Math.random()}.${ext}`);
  fs.writeFileSync(f, body);
  try {
    const p = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height:format=duration", "-of", "json", f]).toString());
    return { width: p.streams[0].width, height: p.streams[0].height, seconds: Number(p.format.duration) };
  } finally {
    fs.rmSync(f, { force: true });
  }
}

test.describe("POST /api/make (GIF maker)", () => {
  test("makes a slideshow GIF from pictures of different types, in order and on time", async ({ request }) => {
    const res = await make(request, ["wide.png", "tall.jpg", "still.webp", "odd.gif"], { frameMs: 500, width: 480 });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/gif");
    expect(res.headers()["content-disposition"]).toContain("gifsuite-maker.gif");
    const out = probe(await res.body(), "gif");
    expect(out).toMatchObject({ width: 480, height: 360 }); // the first picture's 4:3 shape
    expect(out.seconds).toBeCloseTo(2, 1);
  });

  test("crossfades shorten the total by each overlap", async ({ request }) => {
    const res = await make(request, ["wide.png", "tall.jpg", "square.png"], { frameMs: 1000, crossfade: true, width: 320, fit: "cover" });
    expect(res.status()).toBe(200);
    expect(probe(await res.body(), "gif").seconds).toBeCloseTo(2, 1);
  });

  test("brings one picture to life as an MP4", async ({ request }) => {
    const res = await make(request, ["tall.jpg"], { effect: "zoom", durationMs: 2000, width: 320, format: "mp4" });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("video/mp4");
    const out = probe(await res.body(), "mp4");
    expect(out).toMatchObject({ width: 320, height: 426 });
    expect(out.seconds).toBeCloseTo(2, 1);
  });

  test("explains what's wrong", async ({ request }) => {
    const textFile = async () => {
      const form = new FormData();
      form.append("image", new Blob(["just text"]), "notes.png");
      form.append("settings", "{}");
      return request.post("/api/make", { multipart: form, headers: visitor() });
    };
    const t = await textFile();
    expect(t.status()).toBe(415);
    expect((await t.json()).error).toMatch(/isn't a JPEG, PNG, WebP or GIF/);

    const noImages = await request.post("/api/make", { multipart: { settings: "{}" }, headers: visitor() });
    expect(noImages.status()).toBe(400);
    expect((await noImages.json()).error).toMatch(/at least one image/);

    const badWidth = await make(request, ["wide.png", "tall.jpg"], { width: 999 });
    expect(badWidth.status()).toBe(400);
    expect((await badWidth.json()).error).toMatch(/width of 320, 480 or 640/);

    const tooLong = await make(request, Array(13).fill("wide.png"), { frameMs: 5000 });
    expect(tooLong.status()).toBe(400);
    expect((await tooLong.json()).error).toMatch(/longer than 60 seconds/);

    // The test server's upload limit is 3 MB.
    const big = new FormData();
    big.append("image", new Blob([new Uint8Array(4 * 1024 * 1024)]), "big.png");
    big.append("settings", "{}");
    const tooBig = await request.post("/api/make", { multipart: big, headers: visitor() });
    expect(tooBig.status()).toBe(413);
  });
});
