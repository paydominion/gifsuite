import fs from "node:fs";
import { Readable } from "node:stream";
import { getGif, recordEvent } from "@/db/gifs";
import { ensureFormat, FORMATS, isFormat, isQuality } from "@/lib/media/convert";
import { visitorHash } from "@/lib/request";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = new URL(req.url).searchParams;
  const format = search.get("format") ?? "gif";
  const quality = search.get("quality") ?? "medium";
  const gif = getGif(id);
  if (!gif || gif.hidden) return new Response("Not found", { status: 404 });
  if (!isFormat(format)) return new Response("Unknown format", { status: 400 });
  if (!isQuality(quality)) return new Response("Unknown quality", { status: 400 });

  let file: string;
  try {
    file = await ensureFormat(id, format, quality);
  } catch (err) {
    console.error(`[download] ${id} ${quality}.${format} conversion failed:`, err);
    return new Response("Conversion failed", { status: 500 });
  }
  recordEvent(id, "download", `${format}:${quality}`, visitorHash(req));

  const name = `${gif.authorHandle}-${id}-${quality}.${format}`.replace(/[^\w.-]/g, "_");
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: {
      "content-type": FORMATS[format].mime,
      "content-length": String(fs.statSync(file).size),
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
