import "server-only";
import crypto from "node:crypto";

/**
 * The visitor's IP. Cloudflare sets `cf-connecting-ip` on every request it forwards, and
 * a visitor can't override it. `x-forwarded-for` can be faked by anyone, so it's only
 * trusted when TRUST_FORWARDED_FOR=1 (the test suite uses it to simulate many visitors).
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  if (process.env.TRUST_FORWARDED_FOR === "1") {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return "unknown";
}

/** Constant-time comparison, so response timing doesn't reveal how much of a secret matched. */
export function safeEqual(a: string, b: string): boolean {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
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
