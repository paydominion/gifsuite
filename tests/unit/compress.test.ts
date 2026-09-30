import { describe, expect, it } from "vitest";
import { COMPRESS, firstAttempt, gifArgs, growAttempt, nextAttempt } from "../../processor/presets.mjs";

describe("firstAttempt", () => {
  it("starts at the source size, capped at 20fps and any max width", () => {
    expect(firstAttempt({ width: 640, fps: 30 })).toEqual({ width: 640, fps: 20, colors: 256 });
    expect(firstAttempt({ width: 640, fps: 12 }, 320)).toEqual({ width: 320, fps: 12, colors: 256 });
    expect(firstAttempt({ width: 200, fps: 10 }, 480)).toEqual({ width: 200, fps: 10, colors: 256 });
  });

  it("never goes below the floors, even for odd inputs", () => {
    expect(firstAttempt({ width: 40, fps: 0 })).toEqual({ width: COMPRESS.minWidth, fps: 15, colors: 256 });
  });
});

describe("nextAttempt", () => {
  const start = { width: 640, fps: 20, colors: 256 };

  it("only ever shrinks, and shrinks more the further it is from the target", () => {
    const near = nextAttempt(start, 1_200_000, 1_000_000)!;
    const far = nextAttempt(start, 8_000_000, 1_000_000)!;
    for (const next of [near, far]) {
      expect(next.width).toBeLessThanOrEqual(start.width);
      expect(next.fps).toBeLessThanOrEqual(start.fps);
      expect(next.colors).toBeLessThanOrEqual(start.colors);
    }
    expect(far.width).toBeLessThan(near.width);
    expect(near.colors).toBe(256); // a small miss shouldn't cost colours
    expect(far.colors).toBeLessThan(256);
  });

  it("respects the floors and gives up when nothing smaller is left", () => {
    let s: ReturnType<typeof nextAttempt> = start;
    let steps = 0;
    while (s) {
      expect(s.width).toBeGreaterThanOrEqual(COMPRESS.minWidth);
      expect(s.fps).toBeGreaterThanOrEqual(COMPRESS.minFps);
      expect(s.colors).toBeGreaterThanOrEqual(COMPRESS.minColors);
      s = nextAttempt(s, 50_000_000, 10_000); // hopeless target
      expect(++steps).toBeLessThan(40); // always terminates
    }
    expect(nextAttempt({ width: COMPRESS.minWidth, fps: COMPRESS.minFps, colors: COMPRESS.minColors }, 50_000, 10_000)).toBeNull();
  });
});

describe("growAttempt", () => {
  const s = { width: 300, fps: 10, colors: 128 };

  it("widens a result that landed well under the target, up to the allowed width", () => {
    expect(growAttempt(s, 400_000, 1_000_000, 640)!.width).toBeGreaterThan(300);
    expect(growAttempt(s, 100_000, 1_000_000, 360)!.width).toBe(360);
    expect(growAttempt(s, 400_000, 1_000_000, 640)).toMatchObject({ fps: 10, colors: 128 });
  });

  it("leaves a close-enough or already-widest result alone", () => {
    expect(growAttempt(s, 900_000, 1_000_000, 640)).toBeNull();
    expect(growAttempt(s, 400_000, 1_000_000, 300)).toBeNull();
  });
});

describe("gifArgs", () => {
  it("uses the locked-down input and forces GIF output", () => {
    const args = gifArgs({ width: 320, fps: 10, colors: 64 }, "in", "out", "gif");
    expect(args.slice(0, 6)).toEqual(["-protocol_whitelist", "file", "-f", "gif", "-i", "in"]);
    expect(args.slice(-3)).toEqual(["-f", "gif", "out"]);
    expect(args[args.indexOf("-vf") + 1]).toContain("fps=10,scale=320:-1");
    expect(args[args.indexOf("-vf") + 1]).toContain("max_colors=64");
  });
});
