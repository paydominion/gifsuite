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

/** Asks Cloudflare for one token. One at a time: the widget can only run one check at once. */
function fetchToken(): Promise<string> {
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

// Cloudflare takes a few seconds to issue a token, so one is fetched ahead of time and kept ready.
// Tokens are single-use and expire after 300 seconds; a ready one is used only if under 4 minutes old.
const TOKEN_FRESH_MS = 240_000;
let nextToken: { token: Promise<string>; at: number } | null = null;

/** Starts getting a token in the background so the next action doesn't wait for it. */
export function prepareHumanCheck() {
  if (!siteKey || (nextToken && Date.now() - nextToken.at < TOKEN_FRESH_MS)) return;
  const token = fetchToken();
  token.catch(() => {
    if (nextToken?.token === token) nextToken = null; // try again at the next action
  });
  nextToken = { token, at: Date.now() };
}

/** A fresh token, or null when the check is off. Uses the one fetched ahead of time when it's still fresh. */
export async function humanToken(): Promise<string | null> {
  if (!siteKey) return null;
  const prepared = nextToken && Date.now() - nextToken.at < TOKEN_FRESH_MS ? nextToken : null;
  nextToken = null;
  const token = await (prepared?.token.catch(() => fetchToken()) ?? fetchToken());
  // Get the next one ready while this request runs.
  setTimeout(prepareHumanCheck, 1000);
  return token;
}

/** fetch with a human-check token attached when the check is on. */
export async function humanFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await humanToken();
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers);
  headers.set("x-turnstile-token", token);
  return fetch(input, { ...init, headers });
}
