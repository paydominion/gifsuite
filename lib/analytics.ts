import "server-only";
import { bindings } from "@/lib/cloudflare";
import { visitorHash } from "@/lib/request";

/**
 * Every server-side event goes to Cloudflare Workers Analytics Engine (binding ANALYTICS), where it
 * can be queried with SQL (`npm run analytics`). Page views are counted separately by Cloudflare
 * Web Analytics in the browser. Writes never block or fail a request, and no IPs are stored: the
 * visitor column is the same anonymous per-day hash used for unique counts in D1.
 *
 * Column layout (Analytics Engine names columns by position, so never reorder; add to the end):
 *   index1  event
 *   blob1   event            blob2 gif id        blob3 detail (format:quality, preset, verdict…)
 *   blob4   outcome          blob5 source site   blob6 country       blob7 visitor   blob8 device
 *   double1 HTTP status      double2 duration ms double3 bytes in    double4 bytes out
 *   double5 score (NSFW)
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
  | "scan_sweep";

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

type Context = { country: string; visitor: string; device: string };

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

function contextOf(req: Request | null): Context {
  if (!req) return { country: "", visitor: "", device: "server" };
  return {
    country: req.headers.get("cf-ipcountry") ?? "",
    visitor: visitorHash(req),
    device: deviceOf(req.headers.get("user-agent")),
  };
}

/** Records one event. `req` is the visitor's request, or null for background work (scans, cron). */
export function logEvent(req: Request | null, event: AnalyticsEventName, fields: AnalyticsFields = {}): void {
  try {
    bindings().ANALYTICS?.writeDataPoint(dataPoint(event, fields, contextOf(req)));
  } catch (err) {
    console.warn(`[analytics] could not record ${event}:`, err);
  }
}

/**
 * Wraps a route handler so every call is recorded with its status, timing and sizes, whatever the
 * outcome (including validation errors and crashes).
 */
export function tracked<A extends unknown[]>(
  event: AnalyticsEventName,
  describe: (req: Request, ...args: A) => Promise<Omit<AnalyticsFields, "status" | "durationMs">> | Omit<AnalyticsFields, "status" | "durationMs">,
  handler: (req: Request, ...args: A) => Promise<Response>,
): (req: Request, ...args: A) => Promise<Response> {
  return async (req, ...args) => {
    const started = Date.now();
    const bytesIn = Number(req.headers.get("content-length") ?? 0);
    let res: Response | undefined;
    try {
      res = await handler(req, ...args);
      return res;
    } finally {
      const status = res?.status ?? 500;
      const fields = await Promise.resolve(describe(req, ...args)).catch(() => ({}));
      logEvent(req, event, {
        outcome: status < 400 ? "ok" : status === 429 ? "rate_limited" : "error",
        ...fields,
        status,
        durationMs: Date.now() - started,
        bytesIn,
        bytesOut: Number(res?.headers.get("content-length") ?? 0),
      });
    }
  };
}
