import type { Metadata } from "next";
import { setting } from "@/lib/cloudflare";
import { CompressTool } from "@/components/tools/CompressTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compress a GIF to fit X, Discord or any size",
  description: "Shrink a GIF or video into a GIF under 15 MB for X, 10 MB for Discord, or any size you choose. Free, and your file isn't stored.",
};

export default function CompressPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Compress &amp; resize</h1>
        <p className="text-muted">
          Pick where the GIF is going and we&apos;ll make it fit, keeping as much quality as the size allows. Nothing is stored.
        </p>
      </header>
      <CompressTool maxUploadMb={Number(setting("MAX_UPLOAD_MB") ?? 25)} />
    </div>
  );
}
