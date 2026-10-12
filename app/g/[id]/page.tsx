import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getGif, isOwner } from "@/db/gifs";
import { OWNER_COOKIE, hashOwnerKey, parseOwnerKey } from "@/lib/owner";
import { siteUrl } from "@/lib/site";
import { DownloadButtons } from "@/components/DownloadButtons";
import { ShareBar } from "@/components/ShareBar";
import { ReportButton, ViewTracker } from "@/components/GifActions";
import { SensitiveGate, VisibilityToggle } from "@/components/GifPrivacy";
import { Card, SectionLabel, cardClass } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/g/[id]">): Promise<Metadata> {
  const { id } = await params;
  const gif = await getGif(id);
  if (!gif || gif.hidden) return {};
  const base = await siteUrl();
  const by = gif.source === "x" ? `@${gif.authorHandle}` : gif.authorName;
  const title = gif.tweetText ? `${gif.tweetText.slice(0, 70)} — ${by}` : `GIF by ${by}`;
  const poster = `${base}/media/${id}/poster.jpg`;
  // Sensitive GIFs get no preview image in chat apps and on X, and stay out of search engines.
  if (gif.nsfw === true) {
    return { title: `GIF by ${by}`, robots: { index: false, follow: false } };
  }
  return {
    // Search engines only list what the timeline shows: public and checked safe. Private and
    // not-yet-checked GIFs still get link previews, so sharing never waits on the check.
    ...(gif.isPublic && gif.nsfw === false ? {} : { robots: { index: false, follow: false } }),
    title,
    description: `Download this GIF from ${by} as GIF, MP4, WebM or WebP.`,
    openGraph: {
      title,
      type: "video.other",
      url: `${base}/g/${id}`,
      images: [{ url: poster, width: gif.width, height: gif.height }],
      // Telegram, Discord, Slack and iMessage play og:video inline.
      videos: [{ url: `${base}/media/${id}/source.mp4`, type: "video/mp4", width: gif.width, height: gif.height }],
    },
    twitter: { card: "summary_large_image", title, images: [poster] },
  };
}

export default async function GifPage({ params }: PageProps<"/g/[id]">) {
  const { id } = await params;
  const gif = await getGif(id);
  if (!gif || gif.hidden) notFound();
  const pageUrl = `${await siteUrl()}/g/${id}`;
  const ownerKey = parseOwnerKey((await cookies()).get(OWNER_COOKIE)?.value);
  const owned = await isOwner(id, hashOwnerKey(ownerKey));

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <ViewTracker gifId={id} />
      <div className="space-y-4 lg:sticky lg:top-20">
        <div className={`${cardClass} overflow-hidden bg-panel`}>
          <SensitiveGate sensitive={gif.nsfw === true} poster={`/media/${id}/poster.jpg`}>
            <video
              src={`/media/${id}/source.mp4`}
              poster={`/media/${id}/poster.jpg`}
              autoPlay
              muted
              loop
              playsInline
              controls={gif.hasAudio}
              width={gif.width}
              height={gif.height}
              className="mx-auto block h-auto max-h-[70vh] w-full object-contain"
            />
          </SensitiveGate>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {gif.source === "x" && (
            <>
              <span>{gif.tweetLikes.toLocaleString()} likes on X</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span>{(gif.durationMs / 1000).toFixed(1)}s</span>
          <span aria-hidden>·</span>
          <span>{gif.width}×{gif.height}</span>
          <span aria-hidden>·</span>
          <a href={gif.tweetUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-fg">
            {gif.source === "x" ? "View original post ↗" : `View on ${gif.source} ↗`}
          </a>
        </div>
      </div>

      <aside className="space-y-4">
        <Card className="space-y-2 p-5">
          <a href={gif.tweetUrl} target="_blank" rel="noopener noreferrer" className="block font-semibold hover:underline">
            {gif.authorName}{" "}
            <span className="font-medium text-muted">{gif.source === "x" ? `@${gif.authorHandle}` : `on ${gif.source}`}</span>
          </a>
          {gif.tweetText && <p className="whitespace-pre-line text-sm text-muted">{gif.tweetText}</p>}
        </Card>

        {owned && (
          <Card className="space-y-2 p-5">
            <SectionLabel>Who sees it</SectionLabel>
            <VisibilityToggle gifId={id} initialPublic={gif.isPublic} nsfw={gif.nsfw} />
          </Card>
        )}

        <Card className="space-y-3 p-5">
          <SectionLabel>Download</SectionLabel>
          <DownloadButtons gifId={id} />
        </Card>

        <Card className="space-y-3 p-5">
          <SectionLabel>Share</SectionLabel>
          <ShareBar gifId={id} authorHandle={gif.authorHandle} pageUrl={pageUrl} fromX={gif.source === "x"} />
        </Card>

        <div className="px-1">
          <ReportButton gifId={id} />
          <span aria-hidden className="mx-2 text-xs text-subtle">·</span>
          <a href="/copyright" className="text-xs font-medium text-subtle underline-offset-2 hover:text-fg hover:underline">
            Copyright takedown
          </a>
        </div>
      </aside>
    </div>
  );
}
