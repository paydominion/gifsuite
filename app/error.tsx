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
      {/* The heading says plainly what happened; the body says what to do. */}
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-balance sm:text-4xl">This page didn&apos;t load</h1>
      <p className="mt-3 text-muted">It&apos;s not you. Reload the page, and if it keeps happening, come back in a minute.</p>
      {error.digest && <p className="mt-2 text-sm text-muted">Error reference: {error.digest}</p>}
      <div className="mt-8 flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
        <Button variant="primary" size="lg" onClick={() => retry()}>Reload page</Button>
        <Link href="/" className={buttonClass({ size: "lg" })}>Go to home page</Link>
      </div>
    </div>
  );
}
