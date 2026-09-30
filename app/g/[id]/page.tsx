import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGif } from "@/db/gifs";
import { siteUrl } from "@/lib/site";
import { DownloadButtons } from "@/components/DownloadButtons";
import { ShareBar } from "@/components/ShareBar";
import { ReportButton, ViewTracker } from "@/components/GifActions";
import { Card, SectionLabel, cardClass } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/g/[id]">): Promise<Metadata> {
  const { id } = await params;
  const gif = await getGif(id);
  if (!gif || gif.hidden) return {};
  const base = await siteUrl();
  const title = gif.tweetText ? `${gif.tweetText.slice(0, 70)} — @${gif.authorHandle}` : `GIF by @${gif.authorHandle}`;
  const poster = `${base}/media/${id}/poster.jpg`;
  return {
    title,
    description: `Download this GIF from @${gif.authorHandle} as GIF, MP4, WebM or WebP.`,
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

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <ViewTracker gifId={id} />
      <div className="space-y-4 lg:sticky lg:top-20">
        <div className={`${cardClass} overflow-hidden bg-panel`}>
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
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{gif.tweetLikes.toLocaleString()} likes on X</span>
          <span aria-hidden>·</span>
          <span>{(gif.durationMs / 1000).toFixed(1)}s</span>
          <span aria-hidden>·</span>
          <span>{gif.width}×{gif.height}</span>
          <span aria-hidden>·</span>
          <a href={gif.tweetUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-fg">
            View original post ↗
          </a>
        </div>
      </div>

      <aside className="space-y-4">
        <Card className="space-y-2 p-5">
          <a href={gif.tweetUrl} target="_blank" rel="noopener noreferrer" className="block font-semibold hover:underline">
            {gif.authorName} <span className="font-medium text-muted">@{gif.authorHandle}</span>
          </a>
          {gif.tweetText && <p className="whitespace-pre-line text-sm text-muted">{gif.tweetText}</p>}
        </Card>

        <Card className="space-y-3 p-5">
          <SectionLabel>Download</SectionLabel>
          <DownloadButtons gifId={id} />
        </Card>

        <Card className="space-y-3 p-5">
          <SectionLabel>Share</SectionLabel>
          <ShareBar gifId={id} authorHandle={gif.authorHandle} pageUrl={pageUrl} />
        </Card>

        <div className="px-1">
          <ReportButton gifId={id} />
        </div>
      </aside>
    </div>
  );
}
