import { describe, expect, it } from "vitest";
import { ffmpegArgs, inputArgs, isFormat, isInput, isQuality } from "../../processor/presets.mjs";

const vf = (args: string[]) => args[args.indexOf("-vf") + 1];

describe("format and quality validation", () => {
  it("accepts only known values", () => {
    expect(["gif", "mp4", "webm", "webp"].every(isFormat)).toBe(true);
    expect(["low", "medium", "high"].every(isQuality)).toBe(true);
    for (const bad of [null, "", "png", "toString", "__proto__", "ultra"]) {
      expect(isFormat(bad)).toBe(false);
      expect(isQuality(bad)).toBe(false);
    }
  });
});

describe("ffmpegArgs", () => {
  it("caps width per quality", () => {
    expect(vf(ffmpegArgs("gif", "low", 30, "in", "out"))).toContain("min(320,iw)");
    expect(vf(ffmpegArgs("gif", "medium", 30, "in", "out"))).toContain("min(480,iw)");
    expect(vf(ffmpegArgs("gif", "high", 30, "in", "out"))).toContain("min(1080,iw)");
  });

  it("lowers the frame rate but never raises it above the source", () => {
    expect(vf(ffmpegArgs("gif", "low", 30, "in", "out"))).toMatch(/^fps=10,/);
    expect(vf(ffmpegArgs("gif", "medium", 30, "in", "out"))).toMatch(/^fps=15,/);
    expect(vf(ffmpegArgs("gif", "medium", 10, "in", "out"))).not.toContain("fps=");
    expect(vf(ffmpegArgs("gif", "high", 60, "in", "out"))).not.toContain("fps=");
  });

  it("keeps the original MP4 untouched at high quality", () => {
    expect(ffmpegArgs("mp4", "high", 30, "in", "out")).toEqual(
      [...inputArgs("mov", "in"), "-c", "copy", "-movflags", "+faststart", "-f", "mp4", "out"],
    );
    expect(ffmpegArgs("mp4", "low", 30, "in", "out")).toContain("libx264");
  });

  it("re-encodes a GIF to MP4 even at high quality, with even dimensions", () => {
    const args = ffmpegArgs("mp4", "high", 10, "in", "out", "gif");
    expect(args).toContain("libx264");
    expect(vf(args)).toContain("trunc(min(1080,iw)/2)*2");
  });

  it("locks every input to one container and local files only", () => {
    for (const input of ["gif", "mov", "matroska"] as const) {
      for (const f of ["gif", "mp4", "webm"] as const) {
        const args = ffmpegArgs(f, "medium", 30, "in", "out", input);
        const i = args.indexOf("-i");
        expect(args.slice(i - 4, i + 2)).toEqual(["-protocol_whitelist", "file", "-f", input, "-i", "in"]);
      }
    }
    expect(["gif", "mov", "matroska"].every(isInput)).toBe(true);
    expect(["hls", "concat", "lavfi", "http", "__proto__"].some(isInput)).toBe(false);
  });

  it("always forces the output container, so a file name can't pick a format", () => {
    for (const f of ["gif", "mp4", "webm"] as const) {
      const args = ffmpegArgs(f, "medium", 30, "in", "out");
      expect(args.slice(-3)).toEqual(["-f", f, "out"]);
    }
  });
});
