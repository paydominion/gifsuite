/** Fire-and-forget analytics event from the browser. */
export function track(gifId: string, type: "view" | "share" | "report", detail?: string) {
  send({ gifId, type, detail });
}

/**
 * A browser-only action or problem, recorded with the current page: "file:mp4", "error:That file is
 * over 25 MB…". Never pass a link or a file name.
 */
export function trackUi(type: "ui" | "client_error", detail: string) {
  send({ type, detail, path: location.pathname });
}

function send(event: Record<string, string | undefined>) {
  const body = JSON.stringify(event);
  if (!navigator.sendBeacon?.("/api/events", body)) {
    fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}
