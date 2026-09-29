import { describe, expect, it } from "vitest";
import { ffmpegArgs, isFormat, isQuality } from "../../processor/presets.mjs";

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
      ["-i", "in", "-c", "copy", "-movflags", "+faststart", "-f", "mp4", "out"],
    );
    expect(ffmpegArgs("mp4", "low", 30, "in", "out")).toContain("libx264");
  });

  it("always forces the output container, so a file name can't pick a format", () => {
    for (const f of ["gif", "mp4", "webm"] as const) {
      const args = ffmpegArgs(f, "medium", 30, "in", "out");
      expect(args.slice(-3)).toEqual(["-f", f, "out"]);
    }
  });
});
