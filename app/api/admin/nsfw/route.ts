import { NextResponse } from "next/server";
import { setNsfw } from "@/db/gifs";
import { isAdmin } from "@/lib/admin";
import { logEvent } from "@/lib/analytics";

/** Overrule the NSFW filter for one GIF, e.g. to clear a false positive. Body: { gifId, nsfw } */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { gifId, nsfw } = (await req.json().catch(() => ({}))) as { gifId?: string; nsfw?: unknown };
  if (!gifId || typeof nsfw !== "boolean") return NextResponse.json({ error: "send gifId and nsfw" }, { status: 400 });
  if (!(await setNsfw(gifId, nsfw))) return NextResponse.json({ error: "not found" }, { status: 404 });
  logEvent(null, "nsfw_override", { gifId, detail: nsfw ? "sensitive" : "safe", source: "admin" });
  return NextResponse.json({ gifId, nsfw });
}
