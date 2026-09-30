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
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">This page didn&apos;t loop back.</h1>
      <p className="mt-3 text-muted">
        The link may be old, or the GIF may have been removed. Try grabbing it again from X.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonClass({ variant: "primary", size: "lg" })}>Grab a GIF</Link>
        <Link href="/tools" className={buttonClass({ size: "lg" })}>All tools</Link>
        <Link href="/blog" className={buttonClass({ variant: "ghost", size: "lg" })}>Blog</Link>
      </div>
    </div>
  );
}
