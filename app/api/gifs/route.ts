import { NextResponse } from "next/server";
import { listGifs } from "@/db/gifs";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const before = Number(params.get("before")) || undefined;
  const limit = Math.min(Number(params.get("limit")) || 24, 60);
  const items = await listGifs(limit, before);
  return NextResponse.json({
    items,
    nextCursor: items.length === limit ? items[items.length - 1].createdAt : null,
  });
}
