// Compiled from content/blog/*.md by scripts/build-content.mjs (`npm run content`).
import generated from "./blog/posts.generated.json";

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string | null;
  type: "tip" | "history";
  tags: string[];
  tool: string | null;
  sources: { title: string; url: string }[];
  reviewedBy: string | null;
  draft: boolean;
  readingMinutes: number;
  html: string;
};

/** Newest first. */
export const POSTS = generated as Post[];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug) ?? null;

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
