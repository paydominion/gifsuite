import { describe, expect, it } from "vitest";
import { DEFAULT_NSFW_THRESHOLD, nsfwVerdict } from "@/lib/nsfw";
import { NSFW, nsfwFrameArgs, worstFrame } from "../../processor/presets.mjs";

const scores = (porn: number, hentai = 0, sexy = 0) => ({ porn, hentai, sexy, frames: 6 });

describe("nsfwVerdict", () => {
  it("trusts X's sensitive mark without needing a scan", () => {
    expect(nsfwVerdict(true, null)).toEqual({ nsfw: true, score: null, source: "x" });
    expect(nsfwVerdict(true, scores(0.01))).toMatchObject({ nsfw: true, source: "x" });
  });

  it("flags explicit scores at or above the threshold, from either explicit class", () => {
    expect(nsfwVerdict(false, scores(DEFAULT_NSFW_THRESHOLD))).toEqual({ nsfw: true, score: DEFAULT_NSFW_THRESHOLD, source: "scan" });
    expect(nsfwVerdict(false, scores(0.1, 0.9))).toMatchObject({ nsfw: true, score: 0.9 });
    expect(nsfwVerdict(false, scores(0.59))).toMatchObject({ nsfw: false, source: "scan" });
  });

  it("doesn't flag 'sexy' alone (swimwear and the like)", () => {
    expect(nsfwVerdict(false, scores(0.05, 0.05, 0.99)).nsfw).toBe(false);
  });

  it("uses a custom threshold", () => {
    expect(nsfwVerdict(false, scores(0.5), 0.4).nsfw).toBe(true);
  });

  it("marks a failed scan as not checked", () => {
    expect(nsfwVerdict(false, null)).toEqual({ nsfw: null, score: null, source: null });
  });
});

describe("worstFrame", () => {
  it("keeps the highest score per class across frames", () => {
    const frame = (porn: number, sexy: number) => [
      { className: "Neutral", probability: 1 - porn - sexy },
      { className: "Porn", probability: porn },
      { className: "Sexy", probability: sexy },
    ];
    expect(worstFrame([frame(0.1, 0.3), frame(0.7, 0.1), frame(0.2, 0.2)])).toEqual({ porn: 0.7, hentai: 0, sexy: 0.3, frames: 3 });
  });
});

describe("nsfwFrameArgs", () => {
  it("samples a fixed number of square raw RGB frames across the clip, from a local file only", () => {
    const args = nsfwFrameArgs("/tmp/in", "/tmp/out.rgb", 3000);
    expect(args.slice(0, 2)).toEqual(["-protocol_whitelist", "file"]);
    expect(args).toContain(`fps=${(NSFW.frames / 3).toFixed(4)},scale=224:224`);
    expect(args.join(" ")).toContain(`-frames:v ${NSFW.frames} -pix_fmt rgb24 -f rawvideo /tmp/out.rgb`);
  });

  it("copes with a missing duration", () => {
    expect(nsfwFrameArgs("/tmp/in", "/tmp/out.rgb", 0)).toContain(`fps=${(NSFW.frames / 0.1).toFixed(4)},scale=224:224`);
  });
});
