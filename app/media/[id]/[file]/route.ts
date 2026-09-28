import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { gifDir } from "@/lib/media/convert";

const FILES: Record<string, string> = {
  "source.mp4": "video/mp4",
  "preview.mp4": "video/mp4",
  "poster.jpg": "image/jpeg",
};

/** Serves stored media with HTTP Range support (Safari/iOS won't play video without it). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  const mime = FILES[file];
  if (!mime || !/^[A-Za-z0-9]+$/.test(id)) return new Response("Not found", { status: 404 });

  const full = path.join(gifDir(id), file);
  let size: number;
  try {
    size = fs.statSync(full).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "content-type": mime,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
  };

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    return new Response(Readable.toWeb(fs.createReadStream(full, { start, end })) as ReadableStream, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
    headers: { ...headers, "content-length": String(size) },
  });
}
