import { NextResponse } from "next/server";
import { getGif, isOwner, setPublic } from "@/db/gifs";
import { logEvent } from "@/lib/analytics";
import { scanAfterResponse } from "@/lib/moderation";
import { hashOwnerKey, ownerKeyFromRequest } from "@/lib/owner";
import { clientIp, rateLimit } from "@/lib/request";

/**
 * Show a GIF on the public timeline, or take it off. Only the browser that grabbed it can do this.
 * Body: { "public": true | false }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The owner cookie is SameSite=Lax, so other sites can't send it; refuse cross-site calls anyway.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!rateLimit(`visibility:${clientIp(req)}`, 30, 60_000)) return new NextResponse(null, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { public?: unknown };
  if (typeof body.public !== "boolean") return NextResponse.json({ error: "Choose public or private." }, { status: 400 });

  const gif = await getGif(id);
  if (!gif || gif.hidden) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await isOwner(id, hashOwnerKey(ownerKeyFromRequest(req))))) {
    return NextResponse.json({ error: "Only the person who grabbed this GIF can change who sees it." }, { status: 403 });
  }
  await setPublic(id, body.public);
  logEvent(req, "visibility", { gifId: id, detail: body.public ? "public" : "private" });
  // A private GIF was never scanned; it joins the timeline once the check passes.
  if (body.public && gif.nsfw === null) scanAfterResponse(id);
  return NextResponse.json({ id, public: body.public });
}
