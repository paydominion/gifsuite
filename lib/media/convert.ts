import "server-only";
import { FORMATS, QUALITIES, isFormat, isQuality } from "@/processor/presets.mjs";
import { convert } from "@/lib/media/processor";
import { hasMedia, putMedia, readMedia, type MediaFile } from "@/lib/storage";

export { FORMATS, QUALITIES, isFormat, isQuality };
export type Format = keyof typeof FORMATS;
export type Quality = keyof typeof QUALITIES;

/**
 * Makes sure `gifs/<id>/out-<quality>.<format>` exists in R2, converting from the source
 * once and keeping the result, and returns its file name.
 *
 * Two simultaneous first requests may both convert; the second write simply replaces the
 * first. (Sharing one in-progress conversion between requests isn't allowed on Workers.)
 */
export async function ensureFormat(id: string, format: Format, quality: Quality = "medium"): Promise<MediaFile> {
  const file: MediaFile = `out-${quality}.${format}`;
  if (await hasMedia(id, file)) return file;

  const source = await readMedia(id, "source.mp4");
  if (!source) throw new Error(`source video missing for ${id}`);
  await putMedia(id, file, await convert(source, format, quality), FORMATS[format].mime);
  return file;
}
