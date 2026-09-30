import "server-only";
import { headers } from "next/headers";
import { setting } from "@/lib/cloudflare";

/** The site's public address with no trailing slash, e.g. https://gifsuite.com. */
export async function siteUrl(): Promise<string> {
  const configured = setting("PUBLIC_BASE_URL");
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only the production site should appear in search engines; staging and previews must not. */
export const indexingAllowed = () => setting("ALLOW_INDEXING") === "1";
