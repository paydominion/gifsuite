"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { TOOLS } from "@/lib/tools";
import { Badge } from "@/components/ui/Card";

/** The header's "Tools" dropdown. A disclosure (button + panel of links): Escape or clicking outside closes it. */
export function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-panel hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-expanded:bg-panel aria-expanded:text-fg"
      >
        Tools
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,26rem)] rounded-2xl border border-line bg-panel p-2 shadow-pop"
        >
          <ul className="grid gap-0.5">
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={tool.status === "live" ? tool.href : "/tools"}
                  onClick={() => setOpen(false)}
                  className="flex items-start justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-line focus-visible:bg-line focus-visible:outline-none"
                >
                  <span>
                    <span className="block text-sm font-semibold">{tool.name}</span>
                    <span className="block text-sm text-muted">{tool.description}</span>
                  </span>
                  {tool.status === "soon" && <Badge>Coming soon</Badge>}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/tools"
            onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-accent underline underline-offset-4 hover:bg-line"
          >
            See all tools
          </Link>
        </div>
      )}
    </div>
  );
}
