import { parseRange } from "@/lib/http-range";
import { getMedia, mediaSize } from "@/lib/storage";

const FILES = {
  "source.mp4": "video/mp4",
  "preview.mp4": "video/mp4",
  "poster.jpg": "image/jpeg",
} as const;
type ServedFile = keyof typeof FILES;

/** Serves stored media from R2 with HTTP Range support (Safari/iOS won't play video without it). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  if (!Object.hasOwn(FILES, file) || !/^[A-Za-z0-9]{1,32}$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const served = file as ServedFile;

  const size = await mediaSize(id, served);
  if (size === null) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "content-type": FILES[served],
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
  };

  const range = parseRange(req.headers.get("range"), size);
  if (range === "unsatisfiable") {
    return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  }
  if (range) {
    const { start, end } = range;
    const part = await getMedia(id, served, { offset: start, length: end - start + 1 });
    if (!part) return new Response("Not found", { status: 404 });
    return new Response(part.body, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }
  const whole = await getMedia(id, served);
  if (!whole) return new Response("Not found", { status: 404 });
  return new Response(whole.body, { headers: { ...headers, "content-length": String(size) } });
}
