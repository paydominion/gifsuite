"use client";

/**
 * Browser side of the human check (Cloudflare Turnstile). `humanFetch` is `fetch` plus a fresh one-time
 * token in `x-turnstile-token`. With no site key configured it's plain fetch, so dev and tests are
 * unaffected. The widget is invisible; Cloudflare only shows a challenge when it's unsure.
 */
type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let siteKey: string | null = null;
let ready: Promise<Turnstile> | null = null;
type Widget = { id: string; resolve: ((token: string) => void) | null; reject: ((e: Error) => void) | null };
let widget: Widget | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function configureHumanCheck(key: string | null) {
  siteKey = key;
}

function load(): Promise<Turnstile> {
  ready ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile didn't load")));
    script.onerror = () => reject(new Error("Turnstile didn't load"));
    document.head.appendChild(script);
  });
  return ready;
}

/** A fresh token, or null when the check is off. One at a time: tokens are single-use. */
export function humanToken(): Promise<string | null> {
  if (!siteKey) return Promise.resolve(null);
  const next = queue.then(async () => {
    const t = await load();
    const el = document.getElementById("human-check");
    if (!el) throw new Error("human check container missing");
    if (!widget) {
      const w: Widget = { id: "", resolve: null, reject: null };
      w.id = t.render(el, {
        sitekey: siteKey,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token: string) => w.resolve?.(token),
        "error-callback": () => w.reject?.(new Error("We couldn't confirm you're a person. Reload the page and try again.")),
      });
      widget = w;
    }
    const w: Widget = widget;
    const token = await new Promise<string>((resolve, reject) => {
      w.resolve = resolve;
      w.reject = reject;
      t.execute(w.id);
    });
    t.reset(w.id); // tokens are single-use; ready the widget for the next action
    return token;
  });
  queue = next.catch(() => {});
  return next;
}

/** fetch with a human-check token attached when the check is on. */
export async function humanFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await humanToken();
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers);
  headers.set("x-turnstile-token", token);
  return fetch(input, { ...init, headers });
}
