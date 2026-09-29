import "server-only";
import { bindings } from "@/lib/cloudflare";

/** Files kept for every GIF, all under gifs/<id>/ in the R2 bucket. */
export type MediaFile = "source.mp4" | "preview.mp4" | "poster.jpg" | `out-${string}.${string}`;

export const mediaKey = (gifId: string, file: MediaFile) => `gifs/${gifId}/${file}`;

export async function putMedia(gifId: string, file: MediaFile, body: ArrayBuffer, contentType: string) {
  await bindings().MEDIA.put(mediaKey(gifId, file), body, { httpMetadata: { contentType } });
}

export async function hasMedia(gifId: string, file: MediaFile): Promise<boolean> {
  return (await mediaSize(gifId, file)) !== null;
}

/** Size in bytes, or null if the file doesn't exist. */
export async function mediaSize(gifId: string, file: MediaFile): Promise<number | null> {
  return (await bindings().MEDIA.head(mediaKey(gifId, file)))?.size ?? null;
}

export async function getMedia(gifId: string, file: MediaFile, range?: R2Range): Promise<R2ObjectBody | null> {
  return bindings().MEDIA.get(mediaKey(gifId, file), range ? { range } : undefined);
}

export async function readMedia(gifId: string, file: MediaFile): Promise<ArrayBuffer | null> {
  const obj = await getMedia(gifId, file);
  return obj ? obj.arrayBuffer() : null;
}
