import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { logEvent } from "@/lib/analytics";
import { scanPending } from "@/lib/moderation";

/**
 * Scans public GIFs whose background NSFW check didn't finish. Called every few minutes by the
 * Worker's cron trigger (worker.ts); an admin can also call it by hand.
 */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await scanPending(10);
  logEvent(null, "scan_sweep", { detail: `scanned ${result.scanned}`, outcome: result.failed ? "error" : "ok", score: result.failed });
  return NextResponse.json(result);
}
