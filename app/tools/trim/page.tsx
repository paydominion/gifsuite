import type { Metadata } from "next";
import { setting } from "@/lib/cloudflare";
import { TrimTool } from "@/components/tools/TrimTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trim a GIF or video",
  description: "Cut a GIF or short video down to the part you want, with a live preview. Download it as GIF or MP4. Free, and your file isn't stored.",
  alternates: { canonical: "/tools/trim" },
};

export default function Page() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Trim</h1>
        <p className="text-muted">Pick the start and end, watch the preview loop just that part, and download it. Your file isn&rsquo;t stored.</p>
      </header>
      <TrimTool maxUploadMb={Number(setting("MAX_UPLOAD_MB") ?? 25)} />
    </div>
  );
}
