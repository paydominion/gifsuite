import crypto from "node:crypto";

/**
 * The pure half of analytics: event names, the Analytics Engine column layout and the helpers that
 * classify a request. No server-only imports, so the Worker entry (worker.ts, which records page
 * views) can use it as well as the app (lib/analytics.ts).
 *
 * Column layout (Analytics Engine names columns by position, so never reorder; add to the end):
 *   index1  event
 *   blob1   event            blob2 gif id        blob3 detail (format:quality, preset, path, action…)
 *   blob4   outcome          blob5 source        blob6 country       blob7 visitor   blob8 device
 *   double1 HTTP status      double2 duration ms double3 bytes in    double4 bytes out
 *   double5 score (NSFW)
 *
 * For "page" events, detail is the path and source is where the visit came from (a referring site,
 * utm_source, "direct", "internal" for clicks within GifSuite, or the crawler's name for bots).
 * For "ui" and "client_error" events, detail is the action or error and source is the page path.
 */
export type AnalyticsEventName =
  | "grab"
  | "view"
  | "share"
  | "report"
  | "download"
  | "convert"
  | "compress"
  | "make"
  | "crop"
  | "edit"
  | "visibility"
  | "nsfw_check"
  | "nsfw_override"
  | "hide"
  | "scan_sweep"
  | "page"
  | "ui"
  | "client_error";

export type AnalyticsFields = {
  gifId?: string;
  detail?: string;
  /** "ok", or what happened instead: "new", "repeat", "flagged", "error", "rate_limited"… */
  outcome?: string;
  source?: string;
  status?: number;
  durationMs?: number;
  bytesIn?: number;
  bytesOut?: number;
  score?: number;
};

export type Context = { country: string; visitor: string; device: string };

const clip = (s: string | undefined, max = 96) => (s ?? "").slice(0, max);

/** The Analytics Engine data point for an event, in the column layout above. */
export function dataPoint(event: AnalyticsEventName, f: AnalyticsFields, ctx: Context): AnalyticsEngineDataPoint {
  return {
    indexes: [event],
    blobs: [event, clip(f.gifId, 16), clip(f.detail), clip(f.outcome ?? "ok", 32), clip(f.source, 32), ctx.country, ctx.visitor, ctx.device],
    doubles: [f.status ?? 0, Math.round(f.durationMs ?? 0), f.bytesIn ?? 0, f.bytesOut ?? 0, f.score ?? 0],
  };
}

export function deviceOf(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  if (/bot|crawl|spider|slurp|preview|facebookexternalhit|discordbot|whatsapp|telegram/i.test(userAgent)) return "bot";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

/** The site a pasted link points at ("giphy.com"), without the rest of the link. "none" if there's no link. */
export function siteOf(text: string): string {
  const host = text.match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?=[/:?#\s"'>)]|$)/i)?.[1];
  return host ? host.toLowerCase().replace(/^(?:www|mobile|m)\./, "") : "none";
}


/** Anonymous per-day visitor id: the same person on the same day gets the same id; no IP is kept. */
export function visitorId(ip: string, userAgent: string | null, salt: string | undefined): string {
  const day = new Date().toISOString().slice(0, 10);
  return crypto
    .createHash("sha256")
    .update(`${ip}|${userAgent ?? ""}|${day}|${salt ?? "gifsuite"}`)
    .digest("hex")
    .slice(0, 16);
}

const CRAWLERS: [RegExp, string][] = [
  [/googlebot|google-inspectiontool|googleother|adsbot-google|mediapartners-google/i, "google"],
  [/bingbot|bingpreview|msnbot/i, "bing"],
  [/duckduckbot/i, "duckduckgo"],
  [/yandex/i, "yandex"],
  [/baiduspider/i, "baidu"],
  [/applebot/i, "apple"],
  [/gptbot|oai-searchbot|chatgpt-user/i, "openai"],
  [/claudebot|claude-user|claude-searchbot/i, "anthropic"],
  [/perplexitybot/i, "perplexity"],
  [/twitterbot/i, "x"],
  [/facebookexternalhit|meta-externalagent/i, "facebook"],
  [/discordbot/i, "discord"],
  [/slackbot/i, "slack"],
  [/telegrambot/i, "telegram"],
  [/whatsapp/i, "whatsapp"],
];

/** Which crawler a bot user agent belongs to ("google", "bing"…), or "other". */
export function crawlerOf(userAgent: string | null): string {
  return CRAWLERS.find(([re]) => re.test(userAgent ?? ""))?.[1] ?? "other";
}

/**
 * Where a page visit came from: utm_source if the link carried one, otherwise the referring site
 * ("google.com"), "internal" for a click within GifSuite, or "direct" (typed, bookmarked, or an app
 * that hides the referrer).
 */
export function visitSource(url: URL, referrer: string | null): string {
  const utm = url.searchParams.get("utm_source");
  if (utm) return utm.toLowerCase().slice(0, 32);
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^(?:www|m|l|lm)\./, "");
    return host === url.hostname.replace(/^www\./, "") ? "internal" : host;
  } catch {
    return "direct";
  }
}

/**
 * True for a request that is a person (or crawler) viewing a page: a full page load, or a click to
 * another page within the site (Next.js fetches the page's data with an `rsc` header). Prefetches,
 * API calls, media, assets and non-GET requests are not page views. robots.txt and the sitemap
 * count too, so crawler visits to them show up.
 */
export function isPageView(req: Request, url: URL): boolean {
  if (req.method !== "GET") return false;
  if (url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml") return true;
  if (/^\/(?:api|media|_next|brand|fonts)\//.test(url.pathname) || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return false;
  const h = req.headers;
  if (h.has("next-router-prefetch") || h.has("next-router-segment-prefetch") || h.get("purpose") === "prefetch" || h.get("sec-purpose")?.includes("prefetch")) return false;
  return h.get("rsc") === "1" || (h.get("accept") ?? "").includes("text/html") || deviceOf(h.get("user-agent")) === "bot";
}
