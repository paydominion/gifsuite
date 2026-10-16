import { NextResponse } from "next/server";
import { recordEvent } from "@/db/gifs";
import { logEvent, siteOf } from "@/lib/analytics";
import { ingest } from "@/lib/ingest";
import { GrabError } from "@/lib/x/fetchTweetMedia";
import { limitGrab, visitorHash } from "@/lib/request";
import { isHuman, notHuman } from "@/lib/turnstile";
import { hashOwnerKey, newOwnerKey, ownerCookie, ownerKeyFromRequest } from "@/lib/owner";

export async function POST(req: Request) {
  const started = Date.now();
  let source = "";
  const log = (status: number, outcome: string, gifId?: string, detail?: string) =>
    logEvent(req, "grab", { gifId, outcome, status, detail, source, durationMs: Date.now() - started });

  if (!(await limitGrab(req))) {
    log(429, "rate_limited");
    return NextResponse.json({ error: "Slow down a little — try again in a minute." }, { status: 429 });
  }
  if (!(await isHuman(req))) {
    log(403, "error", undefined, "failed human check");
    return notHuman();
  }
  const { url, public: isPublic = true } = (await req.json().catch(() => ({}))) as { url?: string; public?: unknown };
  // Which site people paste links from (only the site name, never the link) shows which grab
  // sources to add next.
  source = typeof url === "string" ? siteOf(url) : "";
  if (!url) {
    log(400, "error", undefined, "no link");
    return NextResponse.json({ error: "Paste a link first." }, { status: 400 });
  }
  if (typeof isPublic !== "boolean") return NextResponse.json({ error: "Choose public or private." }, { status: 400 });

  // This browser's owner key, made on its first grab, lets it change its GIFs' visibility later.
  const existingKey = ownerKeyFromRequest(req);
  const ownerKey = existingKey ?? newOwnerKey();

  try {
    const { gif, created } = await ingest(url, { isPublic, ownerKeyHash: hashOwnerKey(ownerKey) });
    await recordEvent(gif.id, "grab", created ? "new" : "repeat", visitorHash(req));
    log(200, created ? "new" : "repeat", gif.id, gif.isPublic ? "public" : "private");
    const res = NextResponse.json({ id: gif.id, created, public: gif.isPublic });
    if (!existingKey && created) {
      const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
      res.cookies.set(ownerCookie(ownerKey, https));
    }
    return res;
  } catch (err) {
    if (err instanceof GrabError) {
      // The message says why (not an X link, age-restricted, too long…), which is what we want to count.
      log(err.status, "error", undefined, err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log(500, "error", undefined, "server error");
    console.error("[grab] failed:", err);
    return NextResponse.json({ error: "Something went wrong grabbing that GIF." }, { status: 500 });
  }
}
