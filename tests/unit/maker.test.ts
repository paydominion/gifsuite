import { describe, expect, it } from "vitest";
import { effectExpr, fitFilter, heldImageInput, imageDemuxer, makeArgs, outputHeight, parseSettings } from "../../processor/maker.mjs";
import { sniffImage } from "@/lib/media/sniff";

const bytes = (s: string, prefix: number[] = []) => new Uint8Array([...prefix, ...Buffer.from(s.padEnd(16, "\0"))]);

describe("recognising images", () => {
  it.each([
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(12).fill(0)]), "jpeg_pipe", "JPEG"],
    [bytes("PNG\r\n", [0x89]), "png_pipe", "PNG"],
    [bytes("RIFF\0\0\0\0WEBPVP8 "), "webp_pipe", "WebP"],
    [bytes("GIF89a"), "gif", "GIF"],
  ])("%#", (b, demuxer, label) => {
    expect(imageDemuxer(b)).toBe(demuxer);
    expect(sniffImage(b)).toBe(label);
  });

  it("refuses anything else, including video and text", () => {
    for (const b of [bytes("\0\0\0\x18ftypmp42"), bytes("<svg xmlns="), bytes("just some text")]) {
      expect(imageDemuxer(b)).toBeNull();
      expect(sniffImage(b)).toBeNull();
    }
  });
});

describe("parseSettings", () => {
  it("one picture means an effect, with defaults", () => {
    expect(parseSettings({}, 1).settings).toEqual({ mode: "effect", effect: "zoom", durationMs: 3000, width: 480, fit: "contain", background: "black", format: "gif" });
  });

  it("several pictures mean a slideshow", () => {
    expect(parseSettings({ frameMs: 200, crossfade: true, width: 320, format: "mp4" }, 4).settings).toEqual({
      mode: "slideshow", frameMs: 200, crossfade: true, width: 320, fit: "contain", background: "black", format: "mp4",
    });
  });

  it.each([
    [{ width: 1000 }, 2, /width/],
    [{ fit: "stretch" }, 2, /fit/],
    [{ format: "webm" }, 2, /GIF or MP4/],
    [{ frameMs: 50 }, 2, /between 0.1 and 5/],
    [{ frameMs: 5000 }, 13, /longer than 60 seconds/],
    [{ effect: "spin" }, 1, /effect/],
    [{ durationMs: 30_000 }, 1, /between 1 and 10/],
    [{}, 0, /at least one/],
    [{}, 31, /up to 30/],
  ])("rejects %j for %i pictures", (raw, count, message) => {
    expect(parseSettings(raw, count).error).toMatch(message);
  });
});

describe("frame shape", () => {
  it("follows the first picture, even, and never taller than twice the width", () => {
    expect(outputHeight(480, { width: 400, height: 300 })).toBe(360);
    expect(outputHeight(320, { width: 300, height: 400 })).toBe(426);
    expect(outputHeight(320, { width: 100, height: 1000 })).toBe(640);
    expect(outputHeight(320, { width: 0, height: 0 })).toBe(240);
  });

  it("fits with bars, or fills by cropping", () => {
    expect(fitFilter("contain", 480, 360, "white")).toContain("force_original_aspect_ratio=decrease");
    expect(fitFilter("contain", 480, 360, "white")).toContain("pad=480:360:(ow-iw)/2:(oh-ih)/2:color=white");
    expect(fitFilter("cover", 480, 360, "black")).toContain("crop=480:360");
  });
});

describe("makeArgs", () => {
  const images = [
    { file: "/t/0", demuxer: "png_pipe" },
    { file: "/t/1", demuxer: "jpeg_pipe" },
    { file: "/t/2", demuxer: "gif" },
  ];
  const size = { width: 320, height: 240 };

  it("reads each picture as a local file with a forced decoder, held for its time", () => {
    expect(heldImageInput(images[1], 10, 0.5)).toEqual([
      "-protocol_whitelist", "file", "-f", "image2", "-pattern_type", "none", "-loop", "1",
      "-framerate", "10", "-t", "0.500", "-c:v", "mjpeg", "-i", "/t/1",
    ]);
  });

  it("joins a plain slideshow end to end, with renumbered frame times, as a looping GIF", () => {
    const { settings } = parseSettings({ frameMs: 500, width: 320 }, 3);
    const args = makeArgs(images, settings, size, "/t/out.gif");
    const graph = args[args.indexOf("-filter_complex") + 1];
    expect(graph).toContain("concat=n=3:v=1:a=0,setpts=N/(10*TB)[j]");
    expect(graph).toContain("palettegen=stats_mode=full");
    expect(args.slice(-5)).toEqual(["-loop", "0", "-f", "gif", "/t/out.gif"]);
  });

  it("overlaps crossfades so the total is shorter by each fade", () => {
    const { settings } = parseSettings({ frameMs: 1000, crossfade: true, width: 320 }, 3);
    const graph = makeArgs(images, settings, size, "/t/o.gif").find((a: string) => a.includes("xfade"))!;
    expect(graph).toContain("xfade=transition=fade:duration=0.500:offset=0.500[x1]");
    expect(graph).toContain("xfade=transition=fade:duration=0.500:offset=1.000[j]");
  });

  it("animates one picture with zoompan at twice the size, and encodes MP4 when asked", () => {
    const { settings } = parseSettings({ effect: "pan", durationMs: 2000, format: "mp4" }, 1);
    const args = makeArgs([images[0]], settings, { width: 480, height: 360 }, "/t/o.mp4");
    const graph = args[args.indexOf("-filter_complex") + 1];
    expect(graph).toContain("scale=960:720");
    expect(graph).toContain("zoompan=z='1.2'");
    expect(graph).toContain(":d=48:s=480x360:fps=24");
    expect(args).toContain("libx264");
    expect(args.slice(0, 6)).toEqual(["-protocol_whitelist", "file", "-f", "png_pipe", "-i", "/t/0"]);
  });

  it("has a motion expression for every effect", () => {
    for (const e of ["zoom", "pan", "pulse", "shake", "none"]) expect(effectExpr(e, 30, 15).z).toBeTruthy();
  });
});
