import type { MetadataRoute } from "next";
import { indexingAllowed, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Staging, previews and local dev must never show up in search results.
  if (!indexingAllowed()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${await siteUrl()}/sitemap.xml`,
  };
}
