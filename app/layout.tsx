import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { Logo } from "@/components/shell/Logo";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${satoshi.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
            <Logo />
            <div className="ml-4 flex items-center gap-1">
              <ToolsMenu />
              <Link href="/blog" className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-panel hover:text-fg">
                Blog
              </Link>
              <Link href="/#latest" className="hidden h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-panel hover:text-fg sm:inline-flex">
                Latest
              </Link>
            </div>
            <Link href="/" className={buttonClass({ variant: "primary", size: "sm", className: "ml-auto" })}>
              Grab a GIF
            </Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
            <span>© {new Date().getFullYear()} GifSuite · Not affiliated with X Corp.</span>
            <span className="flex gap-4">
              <Link href="/blog" className="font-semibold hover:text-fg">Blog</Link>
              <Link href="/tools" className="font-semibold hover:text-fg">All tools</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
