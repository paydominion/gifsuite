import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
import localFont from "next/font/local";
import { Logo } from "@/components/shell/Logo";
import { MobileMenu } from "@/components/shell/MobileMenu";
import { ToolsMenu } from "@/components/shell/ToolsMenu";
import { WebAnalytics } from "@/components/shell/WebAnalytics";
import { ClientEvents } from "@/components/shell/ClientEvents";
import { HumanCheck } from "@/components/shell/HumanCheck";
import { setting } from "@/lib/cloudflare";
import { buttonClass } from "@/components/ui/Button";
import { SHARE_IMAGE, siteUrl } from "@/lib/site";
import { LANDINGS } from "@/lib/landing";
import "./globals.css";

// Self-hosted, unmodified (see app/fonts/LICENSE.md). One variable file covers weights 300–900.
const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Variable.woff2", weight: "300 900", style: "normal" },
    { path: "./fonts/Satoshi-VariableItalic.woff2", weight: "300 900", style: "italic" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const DESCRIPTION = "Grab, convert, compress and make GIFs: download any GIF in any format and quality. An all-in-one suite of GIF tools.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    // Relative image and page addresses below resolve against the site's own address.
    metadataBase: new URL(await siteUrl()),
    title: { default: "GifSuite: grab, convert and make GIFs", template: "%s · GifSuite" },
    description: DESCRIPTION,
    applicationName: "GifSuite",
    openGraph: { type: "website", siteName: "GifSuite", title: "GifSuite: grab, convert and make GIFs", description: DESCRIPTION, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", images: [SHARE_IMAGE.url] },
    // Listing icons here replaces Next's automatic tab icon link, so both are named.
    icons: { icon: { url: "/icon.svg", type: "image/svg+xml" }, apple: "/apple-touch-icon.png" },
  };
}

// Colours the phone browser's own bars to match the page.
export const viewport: Viewport = { themeColor: "#111110", colorScheme: "dark" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request. The CSP nonce changes on each request and is stamped into the
  // HTML, so a page that Next.js prerendered or cached would carry a stale nonce and the browser
  // would block all of its scripts.
  await connection();
  return (
    // Browser extensions add their own attributes to <html> before React loads; don't report those.
    <html lang="en" className={`${satoshi.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <WebAnalytics />
        <ClientEvents />
        <HumanCheck siteKey={setting("TURNSTILE_SITE_KEY") ?? null} />
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
          <nav className="relative mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
            <Logo />
            {/* Desktop: links in the bar. Phones: everything lives in the menu, so nothing can overflow. */}
            <div className="ml-4 hidden items-center gap-1 sm:flex">
              <ToolsMenu />
              <Link href="/blog" className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-panel hover:text-fg">
                Blog
              </Link>
              <Link href="/#latest" className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-panel hover:text-fg">
                Latest
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Hidden on phones via the wrapper: the button's own display class would override `hidden`. */}
              <span className="hidden sm:block">
                <Link href="/" className={buttonClass({ variant: "primary", size: "sm" })}>
                  Grab a GIF
                </Link>
              </span>
              <MobileMenu />
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">{children}</main>

        <footer className="mt-10">
          <div aria-hidden className="halftone-band flip opacity-70" />
          <div className="border-t border-accent bg-accent text-accent-ink">
            {/* Popular tools: one link per landing page, so every page links to them all. */}
            <nav aria-label="Popular tools" className="mx-auto flex max-w-6xl flex-wrap gap-x-1 border-b border-accent-ink/15 px-2 py-2 text-sm font-semibold">
              {LANDINGS.map((l) => (
                <Link key={l.slug} href={`/${l.slug}`} className="inline-flex min-h-11 items-center px-2 hover:underline">
                  {l.eyebrow}
                </Link>
              ))}
            </nav>
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 text-sm font-medium">
              <span>© {new Date().getFullYear()} GifSuite · Not affiliated with X Corp.</span>
              <span className="flex flex-wrap gap-x-1">
                <Link href="/blog" className="inline-flex min-h-11 items-center px-2 font-bold hover:underline">Blog</Link>
                <Link href="/tools" className="inline-flex min-h-11 items-center px-2 font-bold hover:underline">All tools</Link>
                <Link href="/terms" className="inline-flex min-h-11 items-center px-2 font-bold hover:underline">Terms</Link>
                <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 font-bold hover:underline">Privacy</Link>
                <Link href="/copyright" className="inline-flex min-h-11 items-center px-2 font-bold hover:underline">Copyright</Link>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
