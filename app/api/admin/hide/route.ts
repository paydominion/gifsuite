import { NextResponse } from "next/server";
import { setHidden } from "@/db/gifs";
import { safeEqual } from "@/lib/request";

// Admin is disabled unless a long, random token is configured.
const MIN_TOKEN_LENGTH = 24;

export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  const given = req.headers.get("x-admin-token");
  if (!token || token.length < MIN_TOKEN_LENGTH || !given || !safeEqual(given, token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { gifId, hidden = true } = (await req.json().catch(() => ({}))) as { gifId?: string; hidden?: boolean };
  if (!gifId || !setHidden(gifId, hidden)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ gifId, hidden });
}
