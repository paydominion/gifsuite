import { NextResponse } from "next/server";
import { countDistinctReporters, getGif, recordEvent, setHidden } from "@/db/gifs";
import { clientIp, rateLimit, visitorHash } from "@/lib/request";

const CLIENT_EVENTS = new Set(["view", "share", "report"]);
const AUTO_HIDE_REPORTS = Number(process.env.AUTO_HIDE_REPORTS ?? 5);

export async function POST(req: Request) {
  // sendBeacon posts text/plain, so parse the body ourselves.
  const body = (await req.text().then(JSON.parse).catch(() => ({}))) as {
    gifId?: string;
    type?: string;
    detail?: string;
  };
  if (!body.gifId || !body.type || !CLIENT_EVENTS.has(body.type)) {
    return NextResponse.json({ error: "bad event" }, { status: 400 });
  }
  if (!rateLimit(`event:${clientIp(req)}`, 120, 60_000)) return new NextResponse(null, { status: 429 });
  if (!getGif(body.gifId)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const detail = body.detail?.slice(0, 40);
  recordEvent(body.gifId, body.type as "view" | "share" | "report", detail, visitorHash(req));

  if (body.type === "report" && countDistinctReporters(body.gifId) >= AUTO_HIDE_REPORTS) {
    setHidden(body.gifId, true);
  }
  return new NextResponse(null, { status: 204 });
}
