import { NextResponse } from "next/server";
import { tracked } from "@/lib/analytics";
import { crop } from "@/lib/media/processor";
import { maxDurationMs, processorFailure, readUpload, uploadError } from "@/lib/upload";

/**
 * Crops an uploaded GIF or video to a box and returns it as GIF or MP4. The body is the raw file;
 * the box is in the source's own pixels: ?x=&y=&w=&h=&format=gif|mp4. Nothing is stored.
 */
export const POST = tracked("crop", (req) => {
  const q = new URL(req.url).searchParams;
  return { detail: `${q.get("format") ?? "gif"}:${q.get("w")}x${q.get("h")}` };
}, cropUpload);

async function cropUpload(req: Request) {
  const q = new URL(req.url).searchParams;
  const format = q.get("format") ?? "gif";
  if (format !== "gif" && format !== "mp4") return uploadError(400, "Pick GIF or MP4.");
  // A missing value would read as 0, so check each was actually sent before converting it.
  const raw = ["x", "y", "w", "h"].map((k) => q.get(k));
  if (raw.some((v) => v === null || v.trim() === "")) return uploadError(400, "Draw a crop box first.");
  const [x, y, w, h] = raw.map(Number);
  const box = { x, y, w, h };
  if (!Object.values(box).every(Number.isInteger)) return uploadError(400, "Draw a crop box first.");

  const upload = await readUpload(req);
  if (upload instanceof NextResponse) return upload;

  let out: ArrayBuffer;
  try {
    out = await crop(upload.file, { input: upload.kind.input, format, box, maxDurationMs: maxDurationMs() });
  } catch (err) {
    if ((err as { status?: number }).status === 400) return uploadError(400, "That crop box doesn't fit the picture. Draw it again.");
    return processorFailure(err, "crop");
  }
  return new Response(out, {
    headers: {
      "content-type": format === "gif" ? "image/gif" : "video/mp4",
      "content-length": String(out.byteLength),
      "content-disposition": `attachment; filename="gifsuite-cropped.${format}"`,
      "cache-control": "no-store",
    },
  });
}
