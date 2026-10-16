import { describe, expect, it } from "vitest";
import { checkCrop, cropArgs } from "../../processor/presets.mjs";
import { moveBox, presetBox, resizeBox } from "@/components/tools/CropTool";

const source = { width: 640, height: 480 };

describe("checkCrop (processor)", () => {
  it("accepts a box inside the picture", () => {
    expect(checkCrop({ x: "10", y: "20", w: "301", h: "171" }, source, "gif").rect).toEqual({ x: 10, y: 20, w: 301, h: 171 });
  });
  it("rounds MP4 sizes down to even numbers", () => {
    expect(checkCrop({ x: 0, y: 0, w: 301, h: 171 }, source, "mp4").rect).toEqual({ x: 0, y: 0, w: 300, h: 170 });
  });
  it.each([
    [{ x: 0, y: 0, w: 641, h: 100 }, /outside/],
    [{ x: 600, y: 0, w: 100, h: 100 }, /outside/],
    [{ x: -1, y: 0, w: 100, h: 100 }, /too small/],
    [{ x: 0, y: 0, w: 8, h: 100 }, /too small/],
    [{ x: "a", y: 0, w: 100, h: 100 }, /bad crop box/],
    [{ x: 1.5, y: 0, w: 100, h: 100 }, /bad crop box/],
  ])("refuses %j", (box, message) => {
    expect(checkCrop(box, source, "gif").error).toMatch(message);
  });
});

describe("cropArgs", () => {
  const rect = { x: 10, y: 20, w: 300, h: 200 };
  it("crops a GIF with its own palette, capped at 20 fps, local file only", () => {
    const args = cropArgs("gif", rect, 30, "/t/in", "/t/out.gif", "gif");
    expect(args.slice(0, 4)).toEqual(["-protocol_whitelist", "file", "-f", "gif"]);
    expect(args[args.indexOf("-vf") + 1]).toMatch(/^crop=300:200:10:20,fps=20,split/);
  });
  it("keeps the frame rate when it's already 20 or less, and scales very wide crops to 1080", () => {
    expect(cropArgs("gif", rect, 15, "/t/in", "/t/o.gif").join(" ")).not.toContain("fps=");
    expect(cropArgs("mp4", { x: 0, y: 0, w: 1600, h: 900 }, 30, "/t/in", "/t/o.mp4").join(" ")).toContain("crop=1600:900:0:0,scale=1080:-2");
  });
  it("keeps sound in MP4", () => {
    const args = cropArgs("mp4", rect, 30, "/t/in", "/t/o.mp4");
    expect(args).toContain("0:a:0?");
    expect(args).toContain("aac");
  });
});

describe("crop box maths (browser)", () => {
  it("presets the largest centred box of each shape", () => {
    expect(presetBox("1:1", 640, 480)).toEqual({ x: 80, y: 0, w: 480, h: 480 });
    expect(presetBox("9:16", 640, 480)).toEqual({ x: 185, y: 0, w: 270, h: 480 });
    expect(presetBox("16:9", 640, 480)).toEqual({ x: 0, y: 60, w: 640, h: 360 });
    expect(presetBox("free", 640, 480)).toEqual({ x: 64, y: 48, w: 512, h: 384 });
  });

  it("resizes from a corner, keeping the opposite corner still", () => {
    const start = { x: 100, y: 100, w: 200, h: 100 };
    expect(resizeBox("se", start, 50, 20, null, 640, 480)).toEqual({ x: 100, y: 100, w: 250, h: 120 });
    expect(resizeBox("nw", start, 50, 20, null, 640, 480)).toEqual({ x: 150, y: 120, w: 150, h: 80 });
  });

  it("keeps a locked shape and stays inside the picture", () => {
    const square = { x: 400, y: 100, w: 200, h: 200 };
    expect(resizeBox("se", square, 500, 10, 1, 640, 480)).toEqual({ x: 400, y: 100, w: 240, h: 240 });
    expect(resizeBox("nw", square, -1000, -1000, 1, 640, 480)).toEqual({ x: 300, y: 0, w: 300, h: 300 });
  });

  it("never shrinks below 16 pixels", () => {
    expect(resizeBox("se", { x: 0, y: 0, w: 100, h: 100 }, -500, -500, null, 640, 480)).toMatchObject({ w: 16, h: 16 });
  });

  it("moves without leaving the picture", () => {
    const box = { x: 100, y: 100, w: 200, h: 200 };
    expect(moveBox(box, 1000, -1000, 640, 480)).toEqual({ x: 440, y: 0, w: 200, h: 200 });
    expect(moveBox(box, 10.4, 20.6, 640, 480)).toEqual({ x: 110, y: 121, w: 200, h: 200 });
  });
});
