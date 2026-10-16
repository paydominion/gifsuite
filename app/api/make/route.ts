import { tracked } from "@/lib/analytics";
import { sniffImage } from "@/lib/media/sniff";
import { make } from "@/lib/media/processor";
import { limitUpload } from "@/lib/request";
import { isHuman } from "@/lib/turnstile";
import { maxUploadBytes, processorFailure, uploadError } from "@/lib/upload";

const MAX_IMAGES = 30;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * GIF maker: still images in, a GIF or MP4 out. Multipart form with `image` files (1–30, in the
 * order they should play) and `settings` (JSON, see processor/maker.mjs). Nothing is stored.
 */
export const POST = tracked("make", async (req) => {
  const count = req.headers.get("x-gifsuite-images");
  return { detail: count ? `${count} images` : undefined };
}, makeGif);

async function makeGif(req: Request) {
  if (!(await limitUpload(req))) return uploadError(429, "Slow down a little. Try again in a minute.");
  if (!(await isHuman(req))) return uploadError(403, "We couldn't confirm you're a person. Reload the page and try again.");
  const limit = maxUploadBytes();
  if (Number(req.headers.get("content-length") ?? 0) > limit + 1024 * 1024) {
    return uploadError(413, `Those images add up to more than ${limit / 1024 / 1024} MB. Use fewer or smaller ones.`);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return uploadError(400, "Add your images first.");
  const files = form.getAll("image").filter((f): f is File => typeof f !== "string");
  const settings = form.get("settings");
  if (files.length === 0) return uploadError(400, "Add at least one image.");
  if (files.length > MAX_IMAGES) return uploadError(400, `Use up to ${MAX_IMAGES} images.`);
  if (typeof settings !== "string" || settings.length > 2000) return uploadError(400, "Those settings don't look right.");

  let total = 0;
  const clean = new FormData();
  for (const [i, file] of files.entries()) {
    total += file.size;
    if (file.size > MAX_IMAGE_BYTES) return uploadError(413, `Image ${i + 1} is over 10 MB.`);
    if (total > limit) return uploadError(413, `Those images add up to more than ${limit / 1024 / 1024} MB. Use fewer or smaller ones.`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!sniffImage(bytes)) return uploadError(415, `Image ${i + 1} isn't a JPEG, PNG, WebP or GIF.`);
    // Only the bytes go on; names and claimed types from the visitor are dropped.
    clean.append("image", new Blob([bytes]), `image-${i}`);
  }
  clean.append("settings", settings);

  let result: { data: ArrayBuffer; type: string };
  try {
    result = await make(clean);
  } catch (err) {
    // The processor explains bad settings (400) and unreadable images (415/422) in plain words.
    const status = (err as { status?: number }).status;
    if (status === 400 || status === 415) {
      const message = (() => {
        try {
          return (JSON.parse((err as Error).message) as { error?: string }).error;
        } catch {
          return undefined;
        }
      })();
      return uploadError(status, message ?? "Those settings don't look right.");
    }
    if (status === 422) return uploadError(422, "One of those images looks damaged. Try saving it again as JPEG or PNG.");
    return processorFailure(err, "make");
  }

  const ext = result.type.includes("mp4") ? "mp4" : "gif";
  return new Response(result.data, {
    headers: {
      "content-type": ext === "mp4" ? "video/mp4" : "image/gif",
      "content-length": String(result.data.byteLength),
      "content-disposition": `attachment; filename="gifsuite-maker.${ext}"`,
      "cache-control": "no-store",
    },
  });
}
