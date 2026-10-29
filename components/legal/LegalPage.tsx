import Link from "next/link";
import { LEGAL } from "@/lib/legal";

const PAGES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/copyright", label: "Copyright & takedowns" },
];

/** Layout for the legal pages: title, last-updated date, links between them, and the text. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  // The page you're on is marked, so the links read as tabs with a clear "you are here".
  const current = PAGES.find((p) => p.label === title)?.href;
  return (
    <article className="mx-auto max-w-2xl">
      <nav aria-label="Legal pages" className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted">
        {PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={p.href === current ? "page" : undefined}
            className="inline-flex min-h-11 items-center hover:text-fg aria-[current=page]:text-fg aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <header className="mt-4 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
        <p className="text-lg text-muted">{intro}</p>
        <p className="text-sm text-muted">
          Last updated <time dateTime={LEGAL.updated}>{LEGAL.updatedLabel}</time>
        </p>
      </header>
      <div className="prose mt-8">{children}</div>
    </article>
  );
}

export function Email() {
  return <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
}
