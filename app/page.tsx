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
      <section className="relative isolate -mx-4 -mt-8 px-5 pb-10 pt-14 text-center sm:-mt-10 sm:pb-16 sm:pt-24">
        {/* The halftone sun, edge to edge and fading out at the bottom. Decorative: its centre is solid
            yellow so the headline is easy to read, and the form sits on its own solid surface. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_70%,transparent_98%)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing */}
          <img
            src="/brand/burst.svg"
            alt=""
            width={1000}
            height={1000}
            className="sun-breathe absolute left-1/2 top-[46%] w-[max(46rem,118vw)] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[58rem]"
          />
        </div>
        <div className="mx-auto max-w-2xl space-y-6">
          <p className="inline-flex items-center rounded-full bg-bg px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent ring-1 ring-accent/40">
            The all-in-one GIF suite
          </p>
          <h1 className="text-[2.6rem] font-black leading-[1.02] tracking-tight text-balance text-bg sm:text-7xl">
            Grab, convert and make GIFs.
          </h1>
          <p className="mx-auto max-w-md text-lg font-semibold text-balance text-bg/80">
            Paste a link from X, Giphy, Reddit or anywhere to grab its GIF in any format and quality, or upload your own.
          </p>
          <GrabForm />
        </div>
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
                  <Link href={tool.href} className={`${cardClass} dots-corner block h-full p-4 transition-colors hover:border-accent`}>
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
