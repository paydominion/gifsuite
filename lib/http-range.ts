import "server-only";
/**
 * Parses a single `Range: bytes=…` header against a file of `size` bytes.
 * Returns null when there is no usable range (serve the whole file),
 * "unsatisfiable" for a range outside the file, or inclusive byte offsets.
 */
export function parseRange(header: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return null;
  let start = m[1] ? Number(m[1]) : size - Number(m[2]);
  let end = m[1] && m[2] ? Number(m[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(end, size - 1);
  return start > end ? "unsatisfiable" : { start, end };
}
