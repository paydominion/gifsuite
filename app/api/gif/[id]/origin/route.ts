import { NextResponse } from "next/server";
import { getGif } from "@/db/gifs";
import { isOriginalAvailable, originalMediaUrl } from "@/lib/x/fetchTweetMedia";

/** Whether the GIF can be shared on X as the original post's media instead of a re-upload. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gif = getGif(id);
  if (!gif || gif.hidden) return NextResponse.json({ error: "not found" }, { status: 404 });

  const available = await isOriginalAvailable(gif.tweetId, gif.mediaIndex);
  return NextResponse.json({
    available,
    mediaUrl: available ? originalMediaUrl(gif.authorHandle, gif.tweetId, gif.mediaIndex) : null,
  });
}
