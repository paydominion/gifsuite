import type { Metadata } from "next";
import { setting } from "@/lib/cloudflare";
import { SpeedTool } from "@/components/tools/SpeedTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Speed up, slow down or reverse a GIF",
  description: "Change a GIF or video's speed from 0.25× to 4×, play it backwards, or make a boomerang. Download as GIF or MP4. Free, nothing stored.",
  alternates: { canonical: "/tools/speed" },
};

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Speed &amp; reverse</h1>
        <p className="text-muted">Change the speed from 0.25× to 4×, play it backwards, or make a forward-and-back boomerang. Your file isn&rsquo;t stored.</p>
      </header>
      <SpeedTool maxUploadMb={Number(setting("MAX_UPLOAD_MB") ?? 25)} />
    </div>
  );
}
