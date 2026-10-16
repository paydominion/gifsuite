import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, formatDate, getPost } from "@/lib/blog";
import { SHARE_IMAGE, siteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";
import { buttonClass } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `${await siteUrl()}/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: [SHARE_IMAGE.url] },
    ...(post.draft && { robots: { index: false } }),
  };
}

export default async function BlogPost({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const base = await siteUrl();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const tool = TOOLS.find((t) => t.slug === post.tool && t.status === "live");
  const more = POSTS.filter((p) => p.slug !== slug && !p.draft).slice(0, 3);

  // Structured data so search engines can show the post as an article.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    mainEntityOfPage: `${base}/blog/${slug}`,
    author: { "@type": "Organization", name: "GifSuite", url: base },
    publisher: { "@type": "Organization", name: "GifSuite", url: base },
    keywords: post.tags.join(", "),
  };

  return (
    <article className="mx-auto max-w-2xl">
      <script
        type="application/ld+json"
        nonce={nonce}
        // "<" is escaped so post text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/blog" className="font-semibold hover:text-fg">← Blog</Link>
      </nav>

      <header className="mt-6 space-y-3">
        <SectionLabel>{post.type === "history" ? "History of the GIF" : "Tip"}</SectionLabel>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{post.title}</h1>
        <p className="text-lg text-muted">{post.description}</p>
        <p className="text-sm text-subtle">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {post.updated && <> · Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time></>}
          {" · "}{post.readingMinutes} min read
          {post.draft && <span className="font-semibold text-danger"> · DRAFT, not published</span>}
        </p>
      </header>

      {/* Compiled from our own Markdown at build time; raw HTML in posts is escaped by the builder. */}
      <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: post.html }} />

      {post.sources.length > 0 && (
        <section className="mt-10 space-y-2 border-t border-line pt-6">
          <SectionLabel>Sources</SectionLabel>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            {post.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">{s.title}</a>
              </li>
            ))}
          </ol>
          {post.reviewedBy && <p className="text-xs text-subtle">Fact-checked by {post.reviewedBy}.</p>}
        </section>
      )}

      {tool && (
        <Card className="mt-10 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">{tool.name}</p>
            <p className="text-sm text-muted">{tool.description}</p>
          </div>
          <Link href={tool.href} className={buttonClass({ variant: "primary" })}>Try it free</Link>
        </Card>
      )}

      {more.length > 0 && (
        <section className="mt-12 space-y-3">
          <SectionLabel>Keep reading</SectionLabel>
          <ul className="space-y-2">
            {more.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="font-semibold underline-offset-2 hover:underline">{p.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
