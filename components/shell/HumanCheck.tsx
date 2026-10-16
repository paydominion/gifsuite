"use client";

import { configureHumanCheck } from "@/lib/human";

/**
 * Turns the human check on in the browser when a Turnstile site key is set, and gives Cloudflare a
 * place to show a challenge on the rare occasions it needs one. Renders nothing visible otherwise.
 */
export function HumanCheck({ siteKey }: { siteKey: string | null }) {
  configureHumanCheck(siteKey);
  if (!siteKey) return null;
  return <div id="human-check" className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2" />;
}
