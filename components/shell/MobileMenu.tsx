"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { TOOLS } from "@/lib/tools";
import { Badge } from "@/components/ui/Card";

const LINK = "flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 font-semibold hover:bg-panel focus-visible:bg-panel focus-visible:outline-none";

/** The phone header's menu: one button that opens a full-width panel with every destination. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-xl text-fg hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M5 5l12 12M17 5 5 17" /> : <path d="M3 6h16M3 11h16M3 16h16" />}
        </svg>
      </button>

      {open && (
        <div id={panelId} className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-bg px-3 pb-4 pt-2 shadow-pop">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-subtle">Tools</p>
          <ul>
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                {tool.status === "live" ? (
                  <Link href={tool.href} onClick={close} className={LINK}>{tool.name}</Link>
                ) : (
                  <span className={`${LINK} text-subtle hover:bg-transparent`}>
                    {tool.name}
                    <Badge>Soon</Badge>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="my-2 border-t border-line" />
          <ul>
            <li><Link href="/blog" onClick={close} className={LINK}>Blog</Link></li>
            <li><Link href="/#latest" onClick={close} className={LINK}>Latest GIFs</Link></li>
            <li><Link href="/tools" onClick={close} className={LINK}>All tools</Link></li>
          </ul>
        </div>
      )}
    </div>
  );
}
