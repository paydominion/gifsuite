"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track";

export function ViewTracker({ gifId }: { gifId: string }) {
  useEffect(() => track(gifId, "view"), [gifId]);
  return null;
}

export function ReportButton({ gifId }: { gifId: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        track(gifId, "report");
        setDone(true);
      }}
      disabled={done}
      type="button"
      className="text-xs font-medium text-subtle underline-offset-2 hover:text-danger hover:underline disabled:no-underline"
    >
      {done ? "Reported — thanks" : "Report this GIF"}
    </button>
  );
}
