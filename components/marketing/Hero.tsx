/**
 * The halftone-sun hero used by the home page and every landing page, so they share one look:
 * a small eyebrow, a big headline, a short promise, and whatever goes under it (usually a tool).
 */
export function Hero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
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
        {/* A label, not a button: plain light text, without the yellow that marks things you can press. */}
        <p className="inline-flex items-center rounded-full bg-bg px-3 py-1 text-xs font-bold uppercase tracking-widest text-fg">
          {eyebrow}
        </p>
        <h1 className="text-[2.6rem] font-black leading-[1.02] tracking-tight text-balance text-bg sm:text-7xl">{title}</h1>
        <p className="mx-auto max-w-md text-lg font-semibold text-balance text-bg/80">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
