import Link from "next/link";
import { LEGAL } from "@/lib/legal";

const PAGES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/copyright", label: "Copyright & takedowns" },
];

/** Layout for the legal pages: title, last-updated date, links between them, and the text. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl">
      <nav aria-label="Legal pages" className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href} className="inline-flex min-h-11 items-center hover:text-fg">
            {p.label}
          </Link>
        ))}
      </nav>
      <header className="mt-4 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
        <p className="text-lg text-muted">{intro}</p>
        <p className="text-sm text-subtle">
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
