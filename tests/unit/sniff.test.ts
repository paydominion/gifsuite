import { describe, expect, it } from "vitest";
import { sniffUpload } from "@/lib/media/sniff";

const bytes = (...parts: (string | number[])[]) => {
  const out: number[] = [];
  for (const p of parts) out.push(...(typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p));
  while (out.length < 16) out.push(0);
  return new Uint8Array(out);
};

describe("sniffUpload", () => {
  it.each([
    ["GIF89a", bytes("GIF89a"), "gif"],
    ["GIF87a", bytes("GIF87a"), "gif"],
    ["MP4", bytes([0, 0, 0, 0x20], "ftypisom"), "mov"],
    ["MOV", bytes([0, 0, 0, 0x14], "ftypqt  "), "mov"],
    ["WebM", bytes([0x1a, 0x45, 0xdf, 0xa3]), "matroska"],
  ])("recognises %s by its contents", (_, data, input) => {
    expect(sniffUpload(data)?.input).toBe(input);
  });

  it.each([
    ["an HLS playlist", bytes("#EXTM3U\n#EXTINF:1,\nhttp://x/")],
    ["a PNG", bytes([0x89], "PNG\r\n")],
    ["a static WebP", bytes("RIFF", [0, 0, 0, 0], "WEBP")],
    ["HTML", bytes("<!doctype html>")],
    ["a text file named .gif", bytes("hello there, i am not a gif")],
    ["too few bytes", new Uint8Array([0x47, 0x49, 0x46])],
  ])("rejects %s", (_, data) => {
    expect(sniffUpload(data)).toBeNull();
  });
});
