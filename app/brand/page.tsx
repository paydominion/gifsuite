import type { Metadata } from "next";
import { MARKS } from "@/components/brand/Marks";
import { DownloadMark } from "@/components/brand/DownloadMark";
import { Card, SectionLabel } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brand",
  description: "GifSuite's logo options, colours and halftone artwork.",
  robots: { index: false },
};

const YELLOW = "#ffdc4a";
const INK = "#111110";

const COLORS = [
  // Swatches use theme classes: the site's CSP doesn't allow inline styles.
  { name: "Ink", value: INK, swatch: "bg-bg", note: "Background" },
  { name: "Sun", value: YELLOW, swatch: "bg-accent", note: "The only colour: the logo, and anything you can press or have selected" },
  { name: "Paper", value: "#f5f2e6", swatch: "bg-fg", note: "Text" },
];

export default function BrandPage() {
  return (
    <div className="space-y-14">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Brand</h1>
        <p className="text-muted">
          Ink and sun. One yellow on near-black, halftone dots as the texture, and a sunburst as the symbol. Six logo options
          are below; the first is in use now and can be swapped in one line (<code className="text-fg">components/shell/Logo.tsx</code>).
        </p>
      </header>

      <section className="space-y-4">
        <SectionLabel>Logo options</SectionLabel>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MARKS.map(({ id, name, note, Mark }, i) => (
            <li key={id}>
              <Card className="overflow-hidden">
                <div className="grid grid-cols-2">
                  <div id={`mark-${id}`} className="grid aspect-square place-items-center bg-bg text-accent">
                    <Mark size={112} title={`${name} logo`} />
                  </div>
                  <div className="grid aspect-square place-items-center bg-accent text-accent-ink [--mark-cut:var(--accent)]">
                    <Mark size={112} />
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">
                      <span className="text-muted">{i + 1}.</span> {name}
                    </h2>
                    <DownloadMark targetId={`mark-${id}`} fileName={`gifsuite-${id}.svg`} color={YELLOW} cut={INK} />
                  </div>
                  <p className="text-sm text-muted">{note}</p>
                  {/* How it holds up small: header size, tab-icon size, and beside the name. */}
                  <div className="flex items-center gap-4 border-t border-line pt-3 text-accent">
                    <Mark size={48} />
                    <Mark size={28} />
                    <Mark size={16} />
                    <span className="ml-auto flex items-center gap-2 text-fg">
                      <Mark size={26} className="text-accent" />
                      <span className="text-[17px] font-bold tracking-tight">GifSuite</span>
                    </span>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <SectionLabel>Colours</SectionLabel>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COLORS.map((c) => (
            <li key={c.name}>
              <Card className="overflow-hidden">
                <div className={`h-20 border-b border-line ${c.swatch}`} />
                <div className="p-3">
                  <p className="font-semibold">{c.name} <span className="font-mono text-xs text-muted">{c.value}</span></p>
                  <p className="text-sm text-muted">{c.note}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <SectionLabel>Halftone</SectionLabel>
        <p className="max-w-2xl text-sm text-muted">
          Dots are decoration, never a background for text that has to be read. Use them large (the sunburst behind the
          home headline), as a divider band, or as a faint corner on a card. Small things stay solid.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid place-items-center overflow-hidden p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG */}
            <img src="/brand/burst.svg" alt="Halftone sunburst artwork" width={360} height={360} className="w-full max-w-xs" />
          </Card>
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div aria-hidden className="halftone-band" />
              <p className="p-4 text-sm text-muted">Divider band: <code className="text-fg">.halftone-band</code></p>
            </Card>
            <Card className="dots-corner p-6">
              <p className="font-semibold">Card corner</p>
              <p className="text-sm text-muted">A faint dot screen fading from one corner: <code className="text-fg">.dots-corner</code></p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
