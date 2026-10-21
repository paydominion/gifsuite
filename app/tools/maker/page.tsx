import type { Metadata } from "next";
import { setting } from "@/lib/cloudflare";
import { MakerTool } from "@/components/tools/MakerTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GIF maker",
  description: "Make a GIF from your pictures: a slideshow from several, or zoom, pan, pulse and shake effects from one. Free, and nothing is stored.",
  alternates: { canonical: "/tools/maker" },
};

export default function MakerPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">GIF maker</h1>
        <p className="text-muted">
          Add one picture to bring it to life with an effect, or several to make a slideshow. Your pictures aren&rsquo;t stored.
        </p>
      </header>
      <MakerTool maxUploadMb={Number(setting("MAX_UPLOAD_MB") ?? 25)} />
    </div>
  );
}
