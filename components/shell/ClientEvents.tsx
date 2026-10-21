"use client";

import { useEffect } from "react";
import { trackUi } from "@/lib/track";

const MAX_PER_PAGE = 10;
// File names can be personal; keep only that there was one.
const scrub = (text: string) => text.replace(/[^\s"'“”‘’]+\.(?:jpe?g|png|webp|gif|heic|avif|mp4|mov|m4v|webm)\b/gi, "[file]");

/**
 * Records what people run into in the browser: every error message the site shows them (anything
 * rendered with role="alert") and JavaScript crashes. Server events can't see either. Capped per page
 * so a stuck loop can't flood analytics.
 */
export function ClientEvents() {
  useEffect(() => {
    let sent = 0;
    const seen = new WeakMap<Element, string>();
    const send = (type: "ui" | "client_error", detail: string) => {
      if (sent >= MAX_PER_PAGE || !detail.trim()) return;
      sent++;
      trackUi(type, scrub(detail));
    };
    const report = (el: Element) => {
      // Next.js announces each new page title to screen readers in a role="alert" region; that's not an error.
      if (el.closest("next-route-announcer")) return;
      const text = el.textContent?.trim() ?? "";
      if (text && seen.get(el) !== text) {
        seen.set(el, text);
        send("ui", `error:${text}`);
      }
    };
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // An alert whose text changed in place.
        const alert = (m.target instanceof Element ? m.target : m.target.parentElement)?.closest('[role="alert"]');
        if (alert) report(alert);
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('[role="alert"]')) report(node);
          node.querySelectorAll('[role="alert"]').forEach(report);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const onError = (e: ErrorEvent) => send("client_error", e.message || "error");
    const onRejection = (e: PromiseRejectionEvent) => send("client_error", String((e.reason as Error)?.message ?? e.reason ?? "rejection"));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      observer.disconnect();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
