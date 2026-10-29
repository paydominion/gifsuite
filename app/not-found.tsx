import type { Metadata } from "next";
import Link from "next/link";
import { HalftoneBurst } from "@/components/brand/Marks";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Our own 404 page. (Next.js's built-in one uses inline styles, which our CSP blocks.)
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center sm:py-16">
      <HalftoneBurst size={160} className="text-accent" />
      {/* The heading says plainly what happened; the body says how to fix it. */}
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-balance sm:text-4xl">Page not found</h1>
      <p className="mt-3 text-muted">
        The link may be old, or the GIF may have been removed. Try grabbing it again from its original link.
      </p>
      {/* Stacked full width on phones with the main action on top; side by side, most important first, on computers. */}
      <div className="mt-8 flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
        <Link href="/" className={buttonClass({ variant: "primary", size: "lg" })}>Grab a GIF</Link>
        <Link href="/tools" className={buttonClass({ size: "lg" })}>Browse all tools</Link>
        <Link href="/blog" className={buttonClass({ variant: "tertiary", size: "lg" })}>Read the blog</Link>
      </div>
    </div>
  );
}
