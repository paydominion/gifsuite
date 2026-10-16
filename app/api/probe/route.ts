import { NextResponse } from "next/server";
import { probe } from "@/lib/media/processor";
import { processorFailure, readUpload } from "@/lib/upload";

/**
 * Length, size and frame rate of an uploaded clip. Browsers can't tell how long a GIF is, so the
 * Trim tool asks here. The body is the raw file; nothing is stored.
 */
export async function POST(req: Request) {
  const upload = await readUpload(req);
  if (upload instanceof NextResponse) return upload;
  try {
    const info = await probe(upload.file, upload.kind.input);
    return NextResponse.json(info);
  } catch (err) {
    return processorFailure(err, "probe");
  }
}
