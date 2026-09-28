import { NextResponse } from "next/server";
import { recordEvent } from "@/db/gifs";
import { ingestFromX } from "@/lib/ingest";
import { GrabError } from "@/lib/x/fetchTweetMedia";
import { clientIp, rateLimit, visitorHash } from "@/lib/request";

export async function POST(req: Request) {
  if (!rateLimit(`grab:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Slow down a little — try again in a minute." }, { status: 429 });
  }
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) return NextResponse.json({ error: "Paste an X post link." }, { status: 400 });

  try {
    const { gif, created } = await ingestFromX(url);
    recordEvent(gif.id, "grab", created ? "new" : "repeat", visitorHash(req));
    return NextResponse.json({ id: gif.id, created });
  } catch (err) {
    if (err instanceof GrabError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[grab] failed:", err);
    return NextResponse.json({ error: "Something went wrong grabbing that GIF." }, { status: 500 });
  }
}
