import { getGif, recordEvent } from "@/db/gifs";
import { tracked } from "@/lib/analytics";
import { ensureFormat, FORMATS, isFormat, isQuality } from "@/lib/media/convert";
import { visitorHash } from "@/lib/request";
import { getMedia } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export const GET = tracked("download", async (req: Request, { params }: Params) => {
  const search = new URL(req.url).searchParams;
  return { gifId: (await params).id, detail: `${search.get("format") ?? "gif"}:${search.get("quality") ?? "medium"}`, source: "x" };
}, download);

async function download(req: Request, { params }: Params) {
  const { id } = await params;
  const search = new URL(req.url).searchParams;
  const format = search.get("format") ?? "gif";
  const quality = search.get("quality") ?? "medium";
  const gif = await getGif(id);
  if (!gif || gif.hidden) return new Response("Not found", { status: 404 });
  if (!isFormat(format)) return new Response("Unknown format", { status: 400 });
  if (!isQuality(quality)) return new Response("Unknown quality", { status: 400 });

  let obj: R2ObjectBody | null;
  try {
    obj = await getMedia(id, await ensureFormat(id, format, quality));
    if (!obj) throw new Error("converted file vanished");
  } catch (err) {
    console.error(`[download] ${id} ${quality}.${format} conversion failed:`, err);
    return new Response("Conversion failed", { status: 500 });
  }
  await recordEvent(id, "download", `${format}:${quality}`, visitorHash(req));

  const name = `${gif.authorHandle}-${id}-${quality}.${format}`.replace(/[^\w.-]/g, "_");
  return new Response(obj.body, {
    headers: {
      "content-type": FORMATS[format].mime,
      "content-length": String(obj.size),
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
