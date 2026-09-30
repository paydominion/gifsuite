import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
import localFont from "next/font/local";
import { Logo } from "@/components/shell/Logo";
import { MobileMenu } from "@/components/shell/MobileMenu";
import { ToolsMenu } from "@/components/shell/ToolsMenu";
import { buttonClass } from "@/components/ui/Button";
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

export const metadata: Metadata = {
  title: { default: "GifSuite: grab, convert and make GIFs", template: "%s · GifSuite" },
  description: "Grab any GIF from X, download it in any format and quality, and post it back. A growing suite of GIF tools.",
};

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
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 text-sm font-medium">
              <span>© {new Date().getFullYear()} GifSuite · Not affiliated with X Corp.</span>
              <span className="flex gap-1">
                <Link href="/blog" className="inline-flex min-h-11 items-center px-2 font-bold hover:underline">Blog</Link>
                <Link href="/tools" className="inline-flex min-h-11 items-center px-2 font-bold hover:underline">All tools</Link>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
