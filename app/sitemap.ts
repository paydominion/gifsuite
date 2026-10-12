import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog";
import { siteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const toolPages = [...new Set(TOOLS.filter((t) => t.status === "live").map((t) => t.href))];
  return [
    ...["/", "/tools", "/blog", ...toolPages.filter((p) => p !== "/")].map((path) => ({ url: `${base}${path}` })),
    ...["/terms", "/privacy", "/copyright"].map((path) => ({ url: `${base}${path}`, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...POSTS.filter((p) => !p.draft).map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updated ?? p.date })),
  ];
}
