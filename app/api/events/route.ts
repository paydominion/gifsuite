import { NextResponse } from "next/server";
import { countDistinctReporters, getGif, recordEvent, setHidden } from "@/db/gifs";
import { logEvent } from "@/lib/analytics";
import { clientIp, rateLimit, reporterHash, visitorHash } from "@/lib/request";
import { setting } from "@/lib/cloudflare";
import { isHuman, notHuman } from "@/lib/turnstile";

const CLIENT_EVENTS = new Set(["view", "share", "report"]);
// Browser-only happenings that aren't about one GIF: what people pick and the errors they see.
const UI_EVENTS = new Set(["ui", "client_error"]);
// Read per request: on Cloudflare, settings are available once a request is being handled.
const AUTO_HIDE_REPORTS = () => Number(setting("AUTO_HIDE_REPORTS") ?? 5);

export async function POST(req: Request) {
  // sendBeacon posts text/plain, so parse the body ourselves.
  const body = (await req.text().then(JSON.parse).catch(() => ({}))) as {
    gifId?: string;
    type?: string;
    detail?: string;
    path?: string;
  };
  if (body.type && UI_EVENTS.has(body.type)) return uiEvent(req, body.type as "ui" | "client_error", body.detail, body.path);
  if (!body.gifId || !body.type || !CLIENT_EVENTS.has(body.type)) {
    return NextResponse.json({ error: "bad event" }, { status: 400 });
  }
  if (!rateLimit(`event:${clientIp(req)}`, 120, 60_000)) return new NextResponse(null, { status: 429 });
  const report = body.type === "report";
  if (report) {
    // Reports can take a GIF down, so they must come from a person on this site: browsers mark
    // requests from other sites, and the human check stops scripts.
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return new NextResponse(null, { status: 403 });
    if (!(await isHuman(req))) return notHuman();
  }
  if (!(await getGif(body.gifId))) return NextResponse.json({ error: "not found" }, { status: 404 });

  const detail = body.detail?.slice(0, 40);
  await recordEvent(body.gifId, body.type as "view" | "share" | "report", detail, report ? reporterHash(req) : visitorHash(req));
  logEvent(req, body.type as "view" | "share" | "report", { gifId: body.gifId, detail });

  if (report && (await countDistinctReporters(body.gifId)) >= AUTO_HIDE_REPORTS()) {
    await setHidden(body.gifId, true);
    logEvent(null, "hide", { gifId: body.gifId, outcome: "auto", detail: "reports" });
  }
  return new NextResponse(null, { status: 204 });
}

/** Recorded in analytics only (not D1). Text is capped and links are removed, so nothing pasted is kept. */
function uiEvent(req: Request, type: "ui" | "client_error", detail: unknown, path: unknown) {
  if (typeof detail !== "string" || !detail.trim()) return NextResponse.json({ error: "bad event" }, { status: 400 });
  if (!rateLimit(`ui:${clientIp(req)}`, 60, 60_000)) return new NextResponse(null, { status: 429 });
  const clean = detail.replace(/\S*(?:https?:\/\/|www\.)\S*/gi, "[link]").replace(/\s+/g, " ").trim().slice(0, 96);
  const page = typeof path === "string" && path.startsWith("/") ? path.split(/[?#]/)[0].slice(0, 64) : "";
  logEvent(req, type, { detail: clean, source: page });
  return new NextResponse(null, { status: 204 });
}
