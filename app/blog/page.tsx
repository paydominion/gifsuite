import type { Metadata } from "next";
import Link from "next/link";
import { POSTS, formatDate, type Post } from "@/lib/blog";
import { SectionLabel, cardClass } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog: GIF tips and the story of the GIF",
  description: "Short, practical tips for making, shrinking and sharing GIFs, plus the history of the format that refuses to die.",
  alternates: { canonical: "/blog" },
};

function PostCard({ post }: { post: Post }) {
  return (
    <li>
      <Link href={`/blog/${post.slug}`} className={`${cardClass} block h-full p-5 transition-colors hover:border-line-strong`}>
        <h3 className="font-semibold text-balance">{post.title}</h3>
        <p className="mt-1.5 text-sm text-muted">{post.description}</p>
        <p className="mt-3 text-xs text-subtle">
          {formatDate(post.date)} · {post.readingMinutes} min read{post.draft ? " · DRAFT" : ""}
        </p>
      </Link>
    </li>
  );
}

export default function BlogIndex() {
  const tips = POSTS.filter((p) => p.type === "tip");
  const history = POSTS.filter((p) => p.type === "history");
  return (
    <div className="space-y-12">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
        <p className="text-muted">Short, practical GIF tips, and the story of the format that refuses to die.</p>
      </header>

      {tips.length > 0 && (
        <section className="space-y-4">
          <SectionLabel>Tips</SectionLabel>
          <ul className="grid gap-3 sm:grid-cols-2">{tips.map((p) => <PostCard key={p.slug} post={p} />)}</ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="space-y-4">
          <SectionLabel>History of the GIF</SectionLabel>
          <ul className="grid gap-3 sm:grid-cols-2">{history.map((p) => <PostCard key={p.slug} post={p} />)}</ul>
        </section>
      )}
    </div>
  );
}
