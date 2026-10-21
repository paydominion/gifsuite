import "server-only";
import crypto from "node:crypto";
import { bindings, setting } from "@/lib/cloudflare";
import { visitorId } from "@/lib/analytics-core";

/**
 * The visitor's IP. Cloudflare sets `cf-connecting-ip` on every request it forwards, and
 * a visitor can't override it. `x-forwarded-for` can be faked by anyone, so it's only
 * used when TRUST_FORWARDED_FOR=1 (the test suite uses it to simulate many visitors).
 */
export function clientIp(req: Request): string {
  if (setting("TRUST_FORWARDED_FOR") === "1") {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

/** Constant-time comparison, so response timing doesn't reveal how much of a secret matched. */
export function safeEqual(a: string, b: string): boolean {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

/** Anonymous per-day visitor id: lets us count unique people without storing IPs. */
export function visitorHash(req: Request): string {
  return visitorId(clientIp(req), req.headers.get("user-agent"), setting("VISITOR_SALT"));
}

const hits = new Map<string, number[]>();

/**
 * Sliding-window in-memory rate limit. Returns true if the call is allowed.
 * On Cloudflare each Worker instance has its own memory, so this is only a local fallback;
 * production uses the shared limiter in `limitGrab`.
 */
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

/** 10 grabs per minute per visitor, shared across all of Cloudflare when the limiter is bound. */
export async function limitGrab(req: Request): Promise<boolean> {
  const key = `grab:${clientIp(req)}`;
  const limiter = bindings().GRAB_LIMITER;
  if (limiter) return (await limiter.limit({ key })).success;
  return rateLimit(key, 10, 60_000);
}

/** 20 uploads per minute per visitor for the file tools (convert, and later the others). */
export async function limitUpload(req: Request): Promise<boolean> {
  const key = `upload:${clientIp(req)}`;
  const limiter = bindings().UPLOAD_LIMITER;
  if (limiter) return (await limiter.limit({ key })).success;
  return rateLimit(key, 20, 60_000);
}
