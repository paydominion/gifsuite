import type { Metadata } from "next";
import Link from "next/link";
import { listGifs } from "@/db/gifs";
import { GrabForm } from "@/components/GrabForm";
import { Hero } from "@/components/marketing/Hero";
import { Timeline } from "@/components/Timeline";
import { SectionLabel, cardClass } from "@/components/ui/Card";
import { ToolIcon } from "@/components/ui/ToolIcon";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const PAGE = 24;

const PROMISES: [string, string][] = [
  ["Free", "Every tool, with no sign-up and no watermark."],
  ["Private by design", "Uploads are processed and sent straight back. Nothing you upload is kept."],
  ["Any format", "GIF, MP4, WebM or WebP, in the quality you need."],
  ["Phone or computer", "Works in any browser. Nothing to install."],
];

export default async function Home() {
  const items = await listGifs(PAGE);
  // The grabber is the form above; the rest of the suite is listed below it.
  const tools = TOOLS.filter((t) => t.slug !== "grab" && t.status === "live");

  return (
    <div className="space-y-16">
      <Hero
        eyebrow="The all-in-one GIF suite"
        title="Grab, convert and make GIFs."
        subtitle="Paste a link from X, Giphy, Reddit or anywhere to grab its GIF in any format and quality, or upload your own."
      >
        <GrabForm />
      </Hero>

      <section aria-labelledby="tools-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="tools-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Every GIF tool, in one place</h2>
            <p className="text-muted">Free, in your browser, on any phone or computer.</p>
          </div>
          <Link href="/tools" className="text-sm font-semibold text-muted hover:text-fg">All tools →</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={tool.href}
                className={`${cardClass} dots-corner group flex h-full gap-3 p-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-panel text-accent transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                  <ToolIcon tool={tool.slug} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{tool.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{tool.description}</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/blog"
              className={`${cardClass} flex h-full flex-col justify-center gap-1 p-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <span className="font-semibold">Tips &amp; guides →</span>
              <span className="text-sm text-muted">Size limits, formats, and how to post GIFs that look right.</span>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-label="Why GifSuite" className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map(([title, text]) => (
          <div key={title} className="bg-surface p-5">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section id="latest" className="scroll-mt-20 space-y-4">
        <SectionLabel>Latest GIFs</SectionLabel>
        <Timeline initial={items} initialCursor={items.length === PAGE ? items[items.length - 1].createdAt : null} />
      </section>
    </div>
  );
}
