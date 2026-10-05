import "server-only";
import crypto from "node:crypto";

/**
 * Without accounts, "the person who grabbed this GIF" is the browser that grabbed it: it gets a
 * random key in an HttpOnly cookie the first time it grabs something, and each GIF it grabs stores
 * only the key's SHA-256. The key itself is never stored, so a database leak can't be used to
 * change anyone's GIFs.
 */
export const OWNER_COOKIE = "gs_owner";
const ONE_YEAR_S = 365 * 24 * 60 * 60;

const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url

export function newOwnerKey(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** The key from a cookie value, or null if there isn't a well-formed one. */
export function parseOwnerKey(value: string | undefined | null): string | null {
  return value && KEY_PATTERN.test(value) ? value : null;
}

export function hashOwnerKey(key: string | null): string | null {
  return key ? crypto.createHash("sha256").update(key).digest("hex") : null;
}

export function ownerKeyFromRequest(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${OWNER_COOKIE}=([^;]+)`));
  return parseOwnerKey(match?.[1]);
}

/** Cookie settings: HttpOnly so page scripts can't read it, SameSite=Lax so other sites can't use it. */
export function ownerCookie(key: string, secure: boolean) {
  return { name: OWNER_COOKIE, value: key, httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: ONE_YEAR_S };
}
