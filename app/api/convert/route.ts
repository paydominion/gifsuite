import { NextResponse } from "next/server";
import { FORMATS, isFormat, isQuality } from "@/lib/media/convert";
import { convert } from "@/lib/media/processor";
import { maxDurationMs, processorFailure, readUpload, uploadError } from "@/lib/upload";

/**
 * Converts an uploaded GIF or video to another format and quality and returns the file.
 * The body is the raw file. Nothing is stored: the upload and the result exist only for this request.
 */
export async function POST(req: Request) {
  const search = new URL(req.url).searchParams;
  const format = search.get("format") ?? "gif";
  const quality = search.get("quality") ?? "medium";
  if (!isFormat(format)) return uploadError(400, "Pick GIF, MP4, WebM or WebP.");
  if (!isQuality(quality)) return uploadError(400, "Pick Low, Medium or High quality.");

  const upload = await readUpload(req);
  if (upload instanceof NextResponse) return upload;

  let out: ArrayBuffer;
  try {
    out = await convert(upload.file, format, quality, { input: upload.kind.input, maxDurationMs: maxDurationMs() });
  } catch (err) {
    return processorFailure(err, "convert");
  }

  return new Response(out, {
    headers: {
      "content-type": FORMATS[format].mime,
      "content-length": String(out.byteLength),
      "content-disposition": `attachment; filename="gifsuite-${quality}.${format}"`,
      "cache-control": "no-store",
    },
  });
}
