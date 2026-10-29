"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Gif } from "@/db/gifs";

function Tile({ gif }: { gif: Gif }) {
  const ref = useRef<HTMLVideoElement>(null);

  // Only play tiles that are on screen, so a long timeline doesn't melt phones.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? video.play().catch(() => {}) : video.pause()),
      { threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <Link
      href={`/g/${gif.id}`}
      className="group mb-3 block break-inside-avoid overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <video
        ref={ref}
        src={`/media/${gif.id}/preview.mp4`}
        poster={`/media/${gif.id}/poster.jpg`}
        muted
        loop
        playsInline
        preload="none"
        width={gif.width}
        height={gif.height}
        className="block h-auto w-full bg-panel"
      />
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
        <span className="truncate text-muted group-hover:text-fg">
          {gif.source === "x" ? `@${gif.authorHandle}` : gif.authorName}
        </span>
        <span className="shrink-0 text-sm text-muted">{new Date(gif.createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}

export function Timeline({ initial, initialCursor }: { initial: Gif[]; initialCursor: number | null }) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || cursor === null) return;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loading) return;
      setLoading(true);
      const res = await fetch(`/api/gifs?before=${cursor}`);
      const data = (await res.json()) as { items: Gif[]; nextCursor: number | null };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setLoading(false);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loading]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
        <p className="font-semibold">No GIFs yet</p>
        <p className="mt-1 text-sm text-muted">Paste a link above to grab the first one.</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
        {items.map((g) => (
          <Tile key={g.id} gif={g} />
        ))}
      </div>
      <div ref={sentinel} className="py-8 text-center text-sm text-muted">
        {cursor === null ? "You're all caught up." : loading ? "Loading…" : ""}
      </div>
    </>
  );
}
