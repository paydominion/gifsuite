import { NextResponse } from "next/server";
import { setHidden } from "@/db/gifs";

export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("x-admin-token") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { gifId, hidden = true } = (await req.json().catch(() => ({}))) as { gifId?: string; hidden?: boolean };
  if (!gifId || !setHidden(gifId, hidden)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ gifId, hidden });
}
