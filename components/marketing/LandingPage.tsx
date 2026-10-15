import { headers } from "next/headers";
import Link from "next/link";
import { setting } from "@/lib/cloudflare";
import { getLanding, type Landing } from "@/lib/landing";
import { siteUrl } from "@/lib/site";
import { GrabForm } from "@/components/GrabForm";
import { Hero } from "@/components/marketing/Hero";
import { CompressTool } from "@/components/tools/CompressTool";
import { ConvertTool } from "@/components/tools/ConvertTool";
import { Card, SectionLabel, cardClass } from "@/components/ui/Card";

/** Page metadata for a landing page: its own title, description and canonical address. */
export async function landingMetadata(slug: string) {
  const page = getLanding(slug)!;
  const url = `${await siteUrl()}/${slug}`;
  return {
    title: { absolute: `${page.title} · GifSuite` },
    description: page.description,
    alternates: { canonical: url },
    openGraph: { type: "website" as const, url, title: page.title, description: page.description },
    twitter: { card: "summary" as const, title: page.title, description: page.description },
  };
}

function Tool({ page }: { page: Landing }) {
  const maxUploadMb = Number(setting("MAX_UPLOAD_MB") ?? 25);
  switch (page.tool.kind) {
    case "grab":
      return null; // the grab form sits inside the hero, like on the home page
    case "convert":
      return <ConvertTool maxUploadMb={maxUploadMb} initialFormat={page.tool.initialFormat} />;
    case "compress":
      return <CompressTool maxUploadMb={maxUploadMb} initialWidth={page.tool.initialWidth} />;
  }
}

/**
 * One template for every landing page, so they share a design: the hero with the tool, how it
 * works, why GifSuite, questions and answers, and links to related tools.
 */
export async function LandingPage({ slug }: { slug: string }) {
  const page = getLanding(slug)!;
  const base = await siteUrl();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const related = page.related.map(getLanding).filter((l): l is Landing => !!l);

  // Structured data: a free web app, and its questions and answers.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: page.eyebrow,
      url: `${base}/${slug}`,
      description: page.description,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any (runs in the browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "GifSuite", url: base },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <div className="space-y-16">
      <script
        type="application/ld+json"
        nonce={nonce}
        // "<" is escaped so the text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Hero eyebrow={page.eyebrow} title={page.h1} subtitle={page.subtitle}>
        {page.tool.kind === "grab" && <GrabForm />}
      </Hero>

      {page.tool.kind !== "grab" && (
        <section aria-label="Tool" className="-mt-8">
          <Tool page={page} />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {page.steps.map(([title, text], i) => (
            <li key={title} className={`${cardClass} p-5`}>
              <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-black text-accent-ink">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Why GifSuite</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {page.why.map(([title, text]) => (
            <li key={title} className={`${cardClass} p-5`}>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Questions</h2>
        <Card className="divide-y divide-line">
          {page.faq.map(([q, a]) => (
            <details key={q} className="group px-5 py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 font-semibold">
                {q}
                <span aria-hidden className="text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 text-sm text-muted">{a}</p>
            </details>
          ))}
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel>More free GIF tools</SectionLabel>
        <ul className="grid gap-3 sm:grid-cols-3">
          {related.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/${r.slug}`}
                className={`${cardClass} block h-full p-5 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <h3 className="font-semibold">{r.eyebrow}</h3>
                <p className="mt-1 text-sm text-muted">{r.subtitle}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
