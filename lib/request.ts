import crypto from "node:crypto";

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/** Anonymous per-day visitor id: lets us count unique people without storing IPs. */
export function visitorHash(req: Request): string {
  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHash("sha256")
    .update(`${clientIp(req)}|${req.headers.get("user-agent") ?? ""}|${day}|${process.env.VISITOR_SALT ?? "gifsuite"}`)
    .digest("hex")
    .slice(0, 16);
}

const hits = new Map<string, number[]>();

/** Sliding-window in-memory rate limit. Returns true if the call is allowed. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
