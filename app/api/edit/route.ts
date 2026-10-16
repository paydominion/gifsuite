import { tracked } from "@/lib/analytics";
import { edit } from "@/lib/media/processor";
import { sniffImage, sniffUpload } from "@/lib/media/sniff";
import { limitUpload } from "@/lib/request";
import { maxDurationMs, maxUploadBytes, processorFailure, uploadError } from "@/lib/upload";

const MAX_OVERLAY_BYTES = 5 * 1024 * 1024;
const TOOLS = new Set(["trim", "speed", "captions"]);

/**
 * Trim, Speed & reverse and Captions. Multipart form: `file` (GIF, MP4, MOV or WebM), optional
 * `overlay` (a transparent PNG the size of the clip, drawn by the browser) and `settings` (JSON:
 * start, end in ms; speed; direction forward|reverse|boomerang; format gif|mp4). Nothing is stored.
 */
export const POST = tracked("edit", (req) => {
  const tool = new URL(req.url).searchParams.get("tool") ?? "";
  return { detail: TOOLS.has(tool) ? tool : "other" };
}, editUpload);

async function editUpload(req: Request) {
  if (!(await limitUpload(req))) return uploadError(429, "Slow down a little. Try again in a minute.");
  const limit = maxUploadBytes();
  if (Number(req.headers.get("content-length") ?? 0) > limit + MAX_OVERLAY_BYTES + 64 * 1024) {
    return uploadError(413, `That file is over ${limit / 1024 / 1024} MB. Try a smaller one.`);
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const overlay = form?.get("overlay");
  const settings = form?.get("settings");
  if (!form || !file || typeof file === "string") return uploadError(400, "Choose a file first.");
  if (typeof settings !== "string" || settings.length > 2000) return uploadError(400, "Those settings don't look right.");
  if (file.size > limit) return uploadError(413, `That file is over ${limit / 1024 / 1024} MB. Try a smaller one.`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffUpload(bytes);
  if (!kind) return uploadError(415, "That isn't a GIF, MP4, MOV or WebM file.");
  // Only the bytes go on; the visitor's file names and claimed types are dropped.
  const clean = new FormData();
  clean.append("file", new Blob([bytes]), "clip");
  if (overlay && typeof overlay !== "string") {
    const layer = new Uint8Array(await overlay.arrayBuffer());
    if (layer.byteLength > MAX_OVERLAY_BYTES || sniffImage(layer) !== "PNG") return uploadError(400, "The caption couldn't be added. Try again.");
    clean.append("overlay", new Blob([layer]), "overlay.png");
  }
  clean.append("settings", settings);

  let result: { data: ArrayBuffer; type: string };
  try {
    result = await edit(clean, { input: kind.input, maxDurationMs: maxDurationMs() });
  } catch (err) {
    // The processor explains impossible settings (400) in plain words.
    if ((err as { status?: number }).status === 400) {
      const message = (() => {
        try {
          return (JSON.parse((err as Error).message) as { error?: string }).error;
        } catch {
          return undefined;
        }
      })();
      return uploadError(400, message ?? "Those settings don't look right.");
    }
    return processorFailure(err, "edit");
  }
  const ext = result.type.includes("mp4") ? "mp4" : "gif";
  return new Response(result.data, {
    headers: {
      "content-type": ext === "mp4" ? "video/mp4" : "image/gif",
      "content-length": String(result.data.byteLength),
      "content-disposition": `attachment; filename="gifsuite-edited.${ext}"`,
      "cache-control": "no-store",
    },
  });
}
