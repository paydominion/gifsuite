import { NextResponse } from "next/server";
import { setting } from "@/lib/cloudflare";
import { FORMATS, isFormat, isQuality } from "@/lib/media/convert";
import { convert, ProcessorError } from "@/lib/media/processor";
import { sniffUpload } from "@/lib/media/sniff";
import { limitUpload } from "@/lib/request";

const maxBytes = () => Number(setting("MAX_UPLOAD_MB") ?? 25) * 1024 * 1024;
const maxDurationMs = () => Number(setting("MAX_DURATION_S") ?? 60) * 1000;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Reads the request body, stopping as soon as it passes the limit (even if Content-Length lies). */
async function readCapped(req: Request, limit: number): Promise<Uint8Array | "too-large"> {
  if (Number(req.headers.get("content-length") ?? 0) > limit) return "too-large";
  if (!req.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = req.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return "too-large";
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Converts an uploaded GIF or video to another format and quality and returns the file.
 * The body is the raw file. Nothing is stored: the upload and the result exist only for this request.
 */
export async function POST(req: Request) {
  if (!(await limitUpload(req))) return fail(429, "Slow down a little. Try again in a minute.");

  const search = new URL(req.url).searchParams;
  const format = search.get("format") ?? "gif";
  const quality = search.get("quality") ?? "medium";
  if (!isFormat(format)) return fail(400, "Pick GIF, MP4, WebM or WebP.");
  if (!isQuality(quality)) return fail(400, "Pick Low, Medium or High quality.");

  const limitMb = maxBytes() / 1024 / 1024;
  const body = await readCapped(req, maxBytes());
  if (body === "too-large") return fail(413, `That file is over ${limitMb} MB. Try a smaller one.`);
  if (body.byteLength === 0) return fail(400, "Choose a file to convert.");

  const kind = sniffUpload(body);
  if (!kind) return fail(415, "That isn't a GIF, MP4, MOV or WebM file.");

  let out: ArrayBuffer;
  try {
    out = await convert(body.buffer as ArrayBuffer, format, quality, { input: kind.input, maxDurationMs: maxDurationMs() });
  } catch (err) {
    if (err instanceof ProcessorError && err.status === 413) {
      return fail(413, `That clip is longer than ${maxDurationMs() / 1000}s. Trim it first.`);
    }
    if (err instanceof ProcessorError && err.status === 422) return fail(422, "That file looks damaged or empty.");
    console.error("[convert] failed:", err);
    return fail(500, "Something went wrong converting that file.");
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
