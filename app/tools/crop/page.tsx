import type { Metadata } from "next";
import { setting } from "@/lib/cloudflare";
import { CropTool } from "@/components/tools/CropTool";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crop a GIF or video",
  description: "Crop a GIF or short video to square, 16:9, 9:16 or any shape by dragging a box. Download it as GIF or MP4. Free, and your file isn't stored.",
};

export default function CropPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Crop</h1>
        <p className="text-muted">Drag a box over your GIF or video, or pick a shape, and download just that part. Your file isn&rsquo;t stored.</p>
      </header>
      <CropTool maxUploadMb={Number(setting("MAX_UPLOAD_MB") ?? 25)} />
    </div>
  );
}
