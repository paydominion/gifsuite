"use client"; // error pages must run in the browser

import Link from "next/link";
import { useEffect } from "react";
import { HalftoneBurst } from "@/components/brand/Marks";
import { Button, buttonClass } from "@/components/ui/Button";

/** Shown if a page breaks unexpectedly: calm, in the site's style, with a way to retry or go home. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center sm:py-16">
      <HalftoneBurst size={160} className="text-accent" />
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-accent">Something went wrong</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">This page skipped a frame.</h1>
      <p className="mt-3 text-muted">It&apos;s not you. Try again, and if it keeps happening, come back in a minute.</p>
      {error.digest && <p className="mt-2 text-xs text-subtle">Error reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button variant="primary" size="lg" onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonClass({ size: "lg" })}>Go home</Link>
      </div>
    </div>
  );
}
