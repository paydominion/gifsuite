import { NextResponse } from "next/server";
import { bindings } from "@/lib/cloudflare";
import { processorHealthy } from "@/lib/media/processor";
import { isPaused, readHealth } from "@/lib/x/resilience";

/**
 * Health check for uptime monitors: is each part of GifSuite answering? 200 when the essentials
 * (database, file storage, media processor) work, 503 when one doesn't. X being paused by the circuit
 * breaker is reported but isn't a failure: grabs fall back to yt-dlp meanwhile. No secrets or
 * internals are included.
 */
export async function GET() {
  const timed = async (fn: () => Promise<boolean>) => {
    const started = Date.now();
    const ok = await fn().catch(() => false);
    return { ok, ms: Date.now() - started };
  };
  const [db, storage, processor] = await Promise.all([
    timed(async () => !!(await bindings().DB.prepare("SELECT 1 AS one").first())),
    timed(async () => (await bindings().MEDIA.head("health-check"), true)),
    timed(processorHealthy),
  ]);
  const x = await readHealth("x");
  const now = Date.now();
  const ok = db.ok && storage.ok && processor.ok;
  return NextResponse.json(
    {
      ok,
      checks: {
        database: db,
        storage,
        processor,
        x: { ok: !isPaused(x, now), paused: isPaused(x, now), recentFailures: x.failures, lastSuccess: x.lastOk ? new Date(x.lastOk).toISOString() : null },
      },
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
