/**
 * Identifies an upload by its first bytes (never its name or claimed type) and maps it to
 * the processor's input container. Returns null for anything we don't accept.
 */
export type UploadKind = { input: "gif" | "mov" | "matroska"; label: string };

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

export function sniffUpload(bytes: Uint8Array): UploadKind | null {
  if (bytes.length < 12) return null;
  const head6 = ascii(bytes, 0, 6);
  if (head6 === "GIF87a" || head6 === "GIF89a") return { input: "gif", label: "GIF" };
  // ISO base media (MP4, MOV, M4V): a box size, then "ftyp".
  if (ascii(bytes, 4, 8) === "ftyp") return { input: "mov", label: "MP4" };
  // Matroska/WebM: EBML magic number.
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { input: "matroska", label: "WebM" };
  }
  return null;
}

/** Still images the GIF maker accepts, identified by their first bytes. */
export function sniffImage(bytes: Uint8Array): "JPEG" | "PNG" | "WebP" | "GIF" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "JPEG";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return "PNG";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "WebP";
  if (ascii(bytes, 0, 3) === "GIF") return "GIF";
  return null;
}
