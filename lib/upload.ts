import "server-only";
import { NextResponse } from "next/server";
import { setting } from "@/lib/cloudflare";
import { sniffUpload, type UploadKind } from "@/lib/media/sniff";
import { limitUpload } from "@/lib/request";
import { isHuman } from "@/lib/turnstile";

export const maxUploadBytes = () => Number(setting("MAX_UPLOAD_MB") ?? 25) * 1024 * 1024;
export const maxDurationMs = () => Number(setting("MAX_DURATION_S") ?? 60) * 1000;

export const uploadError = (status: number, error: string) => NextResponse.json({ error }, { status });

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
 * The checks every upload tool shares: rate limit, size cap, and the real file type read from the
 * file's first bytes. The request body is the raw file. Returns the file, or the error response to send.
 */
export async function readUpload(req: Request): Promise<{ file: ArrayBuffer; kind: UploadKind } | NextResponse> {
  if (!(await limitUpload(req))) return uploadError(429, "Slow down a little. Try again in a minute.");
  if (!(await isHuman(req))) return uploadError(403, "We couldn't confirm you're a person. Reload the page and try again.");

  const limit = maxUploadBytes();
  const body = await readCapped(req, limit);
  if (body === "too-large") return uploadError(413, `That file is over ${limit / 1024 / 1024} MB. Try a smaller one.`);
  if (body.byteLength === 0) return uploadError(400, "Choose a file first.");

  const kind = sniffUpload(body);
  if (!kind) return uploadError(415, "That isn't a GIF, MP4, MOV or WebM file.");
  return { file: body.buffer as ArrayBuffer, kind };
}

/** Turns a processor failure into the message a person should see. */
export function processorFailure(err: unknown, tool: string): NextResponse {
  const status = (err as { status?: number })?.status;
  const message = (err as { message?: string })?.message ?? "";
  if (status === 413 && message.includes("picture too big")) {
    return uploadError(413, "That picture is too big to work with (over 8192 pixels across). Try a smaller one.");
  }
  if (status === 413) return uploadError(413, `That clip is longer than ${maxDurationMs() / 1000}s. Trim it first.`);
  if (status === 503) return uploadError(503, "The converter is busy right now. Try again in a minute.");
  if (status === 422) return uploadError(422, "That file looks damaged or empty.");
  // The processor doesn't know this command: a deploy is still rolling out its new version.
  if (status === 404) return uploadError(503, "The converter is updating. Try again in a minute.");
  console.error(`[${tool}] failed:`, err);
  return uploadError(500, "Something went wrong with that file.");
}
