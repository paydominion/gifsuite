import { listGifs } from "@/db/gifs";
import { GrabForm } from "@/components/GrabForm";
import { Timeline } from "@/components/Timeline";

export const dynamic = "force-dynamic";

const PAGE = 24;

export default async function Home() {
  const items = await listGifs(PAGE);
  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-2xl space-y-4 pt-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Grab any GIF from X.</h1>
        <p className="text-muted">
          Paste a post link. Download it as GIF, MP4, WebM or WebP in any quality, and post it back to X.
        </p>
        <GrabForm />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Latest GIFs</h2>
        <Timeline initial={items} initialCursor={items.length === PAGE ? items[items.length - 1].createdAt : null} />
      </section>
    </div>
  );
}
