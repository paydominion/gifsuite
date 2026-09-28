import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getGif } from "@/db/gifs";
import { DownloadButtons } from "@/components/DownloadButtons";
import { ShareBar } from "@/components/ShareBar";
import { ReportButton, ViewTracker } from "@/components/GifActions";

export const dynamic = "force-dynamic";

async function siteUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: PageProps<"/g/[id]">): Promise<Metadata> {
  const { id } = await params;
  const gif = getGif(id);
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
  const gif = getGif(id);
  if (!gif || gif.hidden) notFound();
  const pageUrl = `${await siteUrl()}/g/${id}`;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <ViewTracker gifId={id} />
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
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
          className="mx-auto block max-h-[70vh] h-auto w-full object-contain"
        />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <a href={gif.tweetUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
            {gif.authorName} <span className="font-normal text-muted">@{gif.authorHandle}</span>
          </a>
          {gif.tweetText && <p className="whitespace-pre-line text-sm">{gif.tweetText}</p>}
          <p className="text-xs text-muted">
            {gif.tweetLikes.toLocaleString()} likes on X · {(gif.durationMs / 1000).toFixed(1)}s · {gif.width}×{gif.height}
            {" · "}
            <a href={gif.tweetUrl} target="_blank" rel="noopener noreferrer" className="underline">View original post</a>
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Download</h2>
          <DownloadButtons gifId={id} />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Share</h2>
          <ShareBar gifId={id} authorHandle={gif.authorHandle} pageUrl={pageUrl} />
        </section>

        <ReportButton gifId={id} />
      </div>
    </div>
  );
}
