import "server-only";
import { setting } from "@/lib/cloudflare";
import { safeEqual } from "@/lib/request";

// Admin is disabled unless a long, random token is configured.
const MIN_TOKEN_LENGTH = 24;

/** True if the request carries the admin token in `x-admin-token`. */
export function isAdmin(req: Request): boolean {
  const token = setting("ADMIN_TOKEN");
  const given = req.headers.get("x-admin-token");
  return !!token && token.length >= MIN_TOKEN_LENGTH && !!given && safeEqual(given, token);
}
