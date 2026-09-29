import Link from "next/link";
import { listGifs } from "@/db/gifs";
import { GrabForm } from "@/components/GrabForm";
import { Timeline } from "@/components/Timeline";
import { Badge, SectionLabel, cardClass } from "@/components/ui/Card";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-dynamic";

const PAGE = 24;

export default async function Home() {
  const items = await listGifs(PAGE);
  const moreTools = TOOLS.filter((t) => t.slug !== "grab").slice(0, 4);

  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-2xl space-y-6 pt-4 text-center sm:pt-10">
        <Badge>The GIF suite for X</Badge>
        <h1 className="text-4xl font-black tracking-tight text-balance sm:text-6xl">Grab any GIF from X.</h1>
        <p className="mx-auto max-w-xl text-lg text-muted text-balance">
          Paste a post link. Download it as GIF, MP4, WebM or WebP in any quality, and post it back to X.
        </p>
        <GrabForm />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <SectionLabel>More tools</SectionLabel>
          <Link href="/tools" className="text-sm font-semibold text-muted hover:text-fg">All tools →</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {moreTools.map((tool) => {
            const body = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{tool.name}</h3>
                  {tool.status === "live" ? <Badge tone="accent">New</Badge> : <Badge>Soon</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">{tool.description}</p>
              </>
            );
            return (
              <li key={tool.slug}>
                {tool.status === "live" ? (
                  <Link href={tool.href} className={`${cardClass} block h-full p-4 transition-colors hover:border-accent`}>
                    {body}
                  </Link>
                ) : (
                  <div className={`${cardClass} h-full p-4`}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section id="latest" className="scroll-mt-20 space-y-4">
        <SectionLabel>Latest GIFs</SectionLabel>
        <Timeline initial={items} initialCursor={items.length === PAGE ? items[items.length - 1].createdAt : null} />
      </section>
    </div>
  );
}
