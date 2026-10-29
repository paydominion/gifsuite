"use client";

import { useEffect, useState } from "react";
import { humanFetch } from "@/lib/human";
import { track } from "@/lib/track";

export function ViewTracker({ gifId }: { gifId: string }) {
  useEffect(() => track(gifId, "view"), [gifId]);
  return null;
}

export function ReportButton({ gifId }: { gifId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  return (
    <button
      onClick={async () => {
        setState("sending");
        // Reports can hide a GIF, so they go with a human-check token rather than as a beacon.
        const res = await humanFetch("/api/events", {
          method: "POST",
          body: JSON.stringify({ gifId, type: "report" }),
          headers: { "content-type": "text/plain" },
        }).catch(() => null);
        setState(res?.ok ? "done" : "failed");
      }}
      disabled={state === "sending" || state === "done"}
      type="button"
      className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-2 hover:text-fg disabled:no-underline"
    >
      {state === "done" ? "Reported — thanks" : state === "sending" ? "Reporting…" : state === "failed" ? "Couldn't report. Try again" : "Report this GIF"}
    </button>
  );
}
