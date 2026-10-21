"use client";

import { useEffect } from "react";
import { configureHumanCheck, prepareHumanCheck } from "@/lib/human";

/**
 * Turns the human check on in the browser when a Turnstile site key is set, and gives Cloudflare a
 * place to show a challenge on the rare occasions it needs one. Renders nothing visible otherwise.
 */
export function HumanCheck({ siteKey }: { siteKey: string | null }) {
  configureHumanCheck(siteKey);
  // Get a token ready once the page has settled, so the first grab or upload doesn't wait for Cloudflare.
  useEffect(() => {
    if (!siteKey) return;
    // …and keep it fresh while the tab is open and visible (a ready token is only used for 4 minutes).
    const refresh = () => document.visibilityState === "visible" && prepareHumanCheck();
    const first = window.setTimeout(refresh, 1000);
    const every = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [siteKey]);
  if (!siteKey) return null;
  return <div id="human-check" className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2" />;
}
