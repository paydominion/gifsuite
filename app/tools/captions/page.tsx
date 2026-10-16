import type { Metadata } from "next";
import { setting } from "@/lib/cloudflare";
import { CaptionTool } from "@/components/tools/CaptionTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add text to a GIF",
  description: "Add meme-style top and bottom text to a GIF or video, with a live preview, outline and fonts. Download as GIF or MP4. Free, nothing stored.",
};

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Add text</h1>
        <p className="text-muted">Type your top and bottom text, see it on the GIF as you go, and download. Your file isn&rsquo;t stored.</p>
      </header>
      <CaptionTool maxUploadMb={Number(setting("MAX_UPLOAD_MB") ?? 25)} />
    </div>
  );
}
