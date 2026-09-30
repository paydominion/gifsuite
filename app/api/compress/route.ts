import { NextResponse } from "next/server";
import { compress } from "@/lib/media/processor";
import { maxDurationMs, processorFailure, readUpload, uploadError } from "@/lib/upload";

const MIN_TARGET = 20 * 1024;
const MAX_TARGET = 100 * 1024 * 1024;
const WIDTHS = new Set([0, 320, 480, 640]);

/**
 * Shrinks an uploaded GIF or video into a GIF at or under `target` bytes, optionally capped at
 * `width` pixels wide. The body is the raw file; nothing is stored. The settings that were needed
 * come back in the X-GifSuite-* headers.
 */
export async function POST(req: Request) {
  const search = new URL(req.url).searchParams;
  const target = Number(search.get("target"));
  const width = Number(search.get("width") ?? 0);
  if (!Number.isInteger(target) || target < MIN_TARGET || target > MAX_TARGET) {
    return uploadError(400, "Pick a target size between 20 KB and 100 MB.");
  }
  if (!WIDTHS.has(width)) return uploadError(400, "Pick a width of 320, 480 or 640, or keep the original.");

  const upload = await readUpload(req);
  if (upload instanceof NextResponse) return upload;

  try {
    const result = await compress(upload.file, {
      input: upload.kind.input,
      targetBytes: target,
      maxWidth: width,
      maxDurationMs: maxDurationMs(),
    });
    return new Response(result.data, {
      headers: {
        "content-type": "image/gif",
        "content-length": String(result.data.byteLength),
        "content-disposition": 'attachment; filename="gifsuite-compressed.gif"',
        "cache-control": "no-store",
        "x-gifsuite-width": String(result.width),
        "x-gifsuite-fps": String(result.fps),
        "x-gifsuite-colors": String(result.colors),
        "x-gifsuite-target-met": String(result.targetMet),
        "x-gifsuite-unchanged": String(result.unchanged),
      },
    });
  } catch (err) {
    return processorFailure(err, "compress");
  }
}
