import "server-only";
import { bindings } from "@/lib/cloudflare";
import { visitorHash } from "@/lib/request";

/**
 * Every server-side event goes to Cloudflare Workers Analytics Engine (binding ANALYTICS), where it
 * can be queried with SQL (`npm run analytics`). Page views are recorded by worker.ts, and browser
 * actions that never reach the server arrive through /api/events. Writes never block or fail a
 * request, and no IPs are stored: the visitor column is the same anonymous per-day hash used for
 * unique counts in D1. The column layout is in lib/analytics-core.ts.
 */
export { dataPoint, deviceOf, siteOf, type AnalyticsEventName, type AnalyticsFields } from "@/lib/analytics-core";
import { dataPoint, deviceOf, type AnalyticsEventName, type AnalyticsFields, type Context } from "@/lib/analytics-core";

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
