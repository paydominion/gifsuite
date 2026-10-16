import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { visitor } from "../helpers";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "tests", ".fixtures", name));

function edit(request: APIRequestContext, name: string, settings: object, overlay?: Buffer, tool = "trim") {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(fixture(name))]), name);
  if (overlay) form.append("overlay", new Blob([new Uint8Array(overlay)]), "overlay.png");
  form.append("settings", JSON.stringify(settings));
  return request.post(`/api/edit?tool=${tool}`, { multipart: form, headers: visitor() });
}

/** Duration, streams and the top-left pixel of a result. */
function inspect(body: Buffer, ext: string) {
  const f = path.join(os.tmpdir(), `edit-${Date.now()}-${Math.random()}.${ext}`);
  fs.writeFileSync(f, body);
  try {
    const p = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type:format=duration", "-of", "json", f]).toString());
    const px = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-frames:v", "1", "-vf", "format=rgb24,crop=1:1:10:10", "-f", "rawvideo", "-"]);
    return { seconds: Number(p.format.duration), streams: p.streams.map((s: { codec_type: string }) => s.codec_type).sort().join("+"), pixel: [...px] };
  } finally {
    fs.rmSync(f, { force: true });
  }
}

test.describe("POST /api/edit (trim, speed and captions)", () => {
  test("trims a video and keeps its sound", async ({ request }) => {
    const res = await edit(request, "sound.mp4", { start: 1000, end: 2500, format: "mp4" });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("video/mp4");
    const out = inspect(await res.body(), "mp4");
    expect(out.seconds).toBeCloseTo(1.5, 1);
    expect(out.streams).toBe("audio+video");
  });

  test("speeds up a video, sound and all", async ({ request }) => {
    const out = inspect(await (await edit(request, "sound.mp4", { speed: 2, format: "mp4" }, undefined, "speed")).body(), "mp4");
    expect(out.seconds).toBeCloseTo(2, 0);
    expect(out.streams).toBe("audio+video");
  });

  test("reverses and boomerangs, silently", async ({ request }) => {
    const reverse = inspect(await (await edit(request, "sound.mp4", { direction: "reverse", format: "mp4" }, undefined, "speed")).body(), "mp4");
    expect(reverse.seconds).toBeCloseTo(4, 0);
    expect(reverse.streams).toBe("video");
    const boomerang = inspect(await (await edit(request, "odd.gif", { direction: "boomerang" }, undefined, "speed")).body(), "gif");
    expect(boomerang.seconds).toBeCloseTo(3.9, 0);
  });

  test("lays the caption layer over every frame", async ({ request }) => {
    const res = await edit(request, "dog.mp4", { format: "gif" }, fixture("caption.png"), "captions");
    expect(res.status()).toBe(200);
    // The caption layer has a solid red square in the top-left corner.
    const [r, g, b] = inspect(await res.body(), "gif").pixel;
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(60);
    expect(b).toBeLessThan(60);
  });

  test("explains settings that can't work", async ({ request }) => {
    const backwards = await edit(request, "sound.mp4", { start: 3000, end: 2000 });
    expect(backwards.status()).toBe(400);
    expect((await backwards.json()).error).toMatch(/start and end/);

    const tooLong = await edit(request, "mid.mp4", { direction: "reverse" }, undefined, "speed");
    expect(tooLong.status()).toBe(400);
    expect((await tooLong.json()).error).toMatch(/up to 20 seconds/);

    const badSpeed = await edit(request, "sound.mp4", { speed: 9 });
    expect(badSpeed.status()).toBe(400);

    const notPng = await edit(request, "dog.mp4", {}, Buffer.from("definitely not a png"), "captions");
    expect(notPng.status()).toBe(400);
    expect((await notPng.json()).error).toMatch(/caption couldn't be added/);

    const notVideo = new FormData();
    notVideo.append("file", new Blob(["text, not a video"]), "x.mp4");
    notVideo.append("settings", "{}");
    expect((await request.post("/api/edit", { multipart: notVideo, headers: visitor() })).status()).toBe(415);
  });

  test("GET the length of a GIF, which browsers can't tell", async ({ request }) => {
    const res = await request.post("/api/probe", { data: fixture("odd.gif"), headers: { ...visitor(), "content-type": "application/octet-stream" } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ width: 301, height: 201, durationMs: expect.any(Number) });
  });
});
