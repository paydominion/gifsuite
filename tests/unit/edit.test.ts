import { describe, expect, it } from "vitest";
import { atempoChain, editArgs, parseEdit } from "../../processor/edit.mjs";
import { clampRange } from "@/components/tools/TrimTool";
import { layoutCaptions, wrap, type CaptionStyle } from "@/lib/captions";

const info = { durationMs: 4000, width: 320, height: 240, fps: 25, hasAudio: true };

describe("parseEdit", () => {
  it("defaults to the whole clip, forward, at normal speed, as GIF", () => {
    expect(parseEdit({}, info).settings).toEqual({ start: 0, end: 4000, speed: 1, direction: "forward", format: "gif", outputMs: 4000 });
  });

  it("works out the new length", () => {
    expect(parseEdit({ start: 1000, end: 3000, speed: 2, direction: "boomerang" }, info).settings!.outputMs).toBe(2000);
    expect(parseEdit({ speed: 0.5 }, info).settings!.outputMs).toBe(8000);
  });

  it.each([
    [{ start: 3000, end: 2000 }, /start and end/],
    [{ start: 0, end: 50 }, /at least 0.1 seconds/],
    [{ end: 9000 }, /inside the clip/],
    [{ speed: 5 }, /0.25× and 4×/],
    [{ direction: "sideways" }, /forward, reverse or boomerang/],
    [{ format: "webm" }, /GIF or MP4/],
  ])("refuses %j", (raw, message) => {
    expect(parseEdit(raw, info).error).toMatch(message);
  });

  it("limits reverse to 20 seconds and results to 60", () => {
    expect(parseEdit({ direction: "reverse" }, { ...info, durationMs: 25_000 }).error).toMatch(/up to 20 seconds/);
    expect(parseEdit({ direction: "reverse", start: 0, end: 20_000 }, { ...info, durationMs: 25_000 }).settings).toBeDefined();
    expect(parseEdit({ speed: 0.25 }, { ...info, durationMs: 20_000 }).error).toMatch(/longer than 60 seconds/);
  });
});

describe("atempoChain", () => {
  it.each([
    [2, "atempo=2"],
    [4, "atempo=2,atempo=2"],
    [3, "atempo=2,atempo=1.5"],
    [0.25, "atempo=0.5,atempo=0.5"],
    [0.75, "atempo=0.75"],
    [1, ""],
  ])("%s× → %s", (speed, chain) => {
    expect(atempoChain(speed)).toBe(chain);
  });
});

describe("editArgs", () => {
  const settings = (raw: object) => parseEdit(raw, info).settings!;
  const graphOf = (args: string[]) => args[args.indexOf("-filter_complex") + 1];

  it("trims, keeps and re-times the sound for a forward MP4", () => {
    const args = editArgs(settings({ start: 1000, end: 3000, speed: 2, format: "mp4" }), info, "/t/in", "mov", null, "/t/o.mp4");
    const graph = graphOf(args);
    expect(graph).toContain("trim=start=1.000:end=3.000");
    expect(graph).toContain("setpts=PTS/2");
    expect(graph).toContain("atrim=start=1.000:end=3.000,asetpts=PTS-STARTPTS,atempo=2[a]");
    expect(args).toContain("[a]");
  });

  it("drops the sound when reversing, and for GIFs", () => {
    expect(graphOf(editArgs(settings({ direction: "reverse", format: "mp4" }), info, "/t/in", "mov", null, "/t/o.mp4"))).not.toContain("atrim");
    expect(graphOf(editArgs(settings({}), info, "/t/in", "mov", null, "/t/o.gif"))).not.toContain("atrim");
  });

  it("builds a boomerang from the clip and its reverse", () => {
    const graph = graphOf(editArgs(settings({ direction: "boomerang" }), info, "/t/in", "mov", null, "/t/o.gif"));
    expect(graph).toContain("[b]reverse,trim=start_frame=1");
    expect(graph).toContain("concat=n=2:v=1:a=0");
  });

  it("caps the frame rate after speeding up: 20 fps for GIF", () => {
    expect(graphOf(editArgs(settings({ speed: 4 }), info, "/t/in", "mov", null, "/t/o.gif"))).toContain("fps=20");
    expect(graphOf(editArgs(settings({ speed: 0.5 }), info, "/t/in", "mov", null, "/t/o.gif"))).not.toContain("fps=");
  });

  it("lays a caption PNG over the clip, read as a local PNG only", () => {
    const args = editArgs(settings({}), info, "/t/in", "gif", "/t/cap.png", "/t/o.gif");
    expect(args.join(" ")).toContain("-protocol_whitelist file -f png_pipe -i /t/cap.png");
    expect(graphOf(args)).toContain("[v0][1:v]overlay=0:0");
  });
});

describe("clampRange (trim sliders)", () => {
  it("keeps start and end inside the clip, in order, at least 0.1 s apart", () => {
    expect(clampRange(1000, 3000, 4000, "start")).toEqual([1000, 3000]);
    expect(clampRange(3500, 3000, 4000, "start")).toEqual([3500, 3600]);
    expect(clampRange(1000, 500, 4000, "end")).toEqual([400, 500]);
    expect(clampRange(-100, 9000, 4000, "end")).toEqual([0, 4000]);
  });
});

describe("caption layout", () => {
  // A fake font: every character is 0.6 × the font size wide.
  const measure = (s: string, size: number) => s.length * size * 0.6;
  const style: CaptionStyle = { top: "", bottom: "", font: "meme", size: "m", color: "white", outline: true, uppercase: true };

  it("wraps words to fit", () => {
    expect(wrap("one two three four", 10, (s) => s.length)).toEqual(["one two", "three four"]);
    expect(wrap("line one\nline two", 100, (s) => s.length)).toEqual(["line one", "line two"]);
  });

  it("puts top text at the top and bottom text at the bottom, in capitals", () => {
    const { top, bottom } = layoutCaptions({ ...style, top: "hello", bottom: "world" }, 320, 240, measure);
    expect(top!.lines[0].text).toBe("HELLO");
    expect(top!.lines[0].y).toBeLessThan(60);
    expect(bottom!.lines.at(-1)!.y).toBeGreaterThan(200);
  });

  it("shrinks long text until every line fits the width", () => {
    const long = "this caption is far too long to fit on a small gif at the chosen size without shrinking";
    const { top } = layoutCaptions({ ...style, top: long, size: "l" }, 320, 240, measure);
    for (const line of top!.lines) expect(measure(line.text, top!.fontSize)).toBeLessThanOrEqual(320 * 0.92 + 1);
    expect(top!.fontSize).toBeLessThan(240 * 0.14);
  });

  it("leaves out empty captions and keeps lowercase when asked", () => {
    const { top, bottom } = layoutCaptions({ ...style, top: "  ", bottom: "quiet", uppercase: false }, 320, 240, measure);
    expect(top).toBeNull();
    expect(bottom!.lines[0].text).toBe("quiet");
  });
});
