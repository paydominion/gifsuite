import type { Metadata } from "next";
import { setting } from "@/lib/cloudflare";
import { ConvertTool } from "@/components/tools/ConvertTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convert a GIF or video",
  description: "Convert a GIF, MP4, MOV or WebM to GIF, MP4, WebM or WebP in low, medium or high quality. Free, and your file isn't stored.",
  alternates: { canonical: "/tools/convert" },
};

export default function ConvertPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Upload &amp; convert</h1>
        <p className="text-muted">
          Turn a GIF or video into GIF, MP4, WebM or WebP. Your file is converted and sent straight back; nothing is stored.
        </p>
      </header>
      <ConvertTool maxUploadMb={Number(setting("MAX_UPLOAD_MB") ?? 25)} />
    </div>
  );
}
