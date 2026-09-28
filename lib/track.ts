/** Fire-and-forget analytics event from the browser. */
export function track(gifId: string, type: "view" | "share" | "report", detail?: string) {
  const body = JSON.stringify({ gifId, type, detail });
  if (!navigator.sendBeacon?.("/api/events", body)) {
    fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}
