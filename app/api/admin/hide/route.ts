import { NextResponse } from "next/server";
import { setHidden } from "@/db/gifs";
import { isAdmin } from "@/lib/admin";
import { logEvent } from "@/lib/analytics";

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { gifId, hidden = true } = (await req.json().catch(() => ({}))) as { gifId?: string; hidden?: boolean };
  if (!gifId || !(await setHidden(gifId, hidden))) return NextResponse.json({ error: "not found" }, { status: 404 });
  logEvent(null, "hide", { gifId, outcome: hidden ? "admin" : "admin_restore", detail: "admin" });
  return NextResponse.json({ gifId, hidden });
}
