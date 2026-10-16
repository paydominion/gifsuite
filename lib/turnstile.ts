import "server-only";
import { setting } from "@/lib/cloudflare";
import { clientIp } from "@/lib/request";

/**
 * Cloudflare Turnstile: an invisible check that a person, not a bot, is using the tools. The browser
 * gets a one-time token before each grab, upload or edit and sends it as `x-turnstile-token`; the
 * server asks Cloudflare whether it's genuine. Off until TURNSTILE_SECRET is set (dev and tests).
 */
export const humanCheckEnabled = () => !!setting("TURNSTILE_SECRET");

const verifyUrl = () => setting("TURNSTILE_VERIFY_URL") ?? "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True if the request carries a genuine, unused token (or the check is off). */
export async function isHuman(req: Request): Promise<boolean> {
  const secret = setting("TURNSTILE_SECRET");
  if (!secret) return true;
  const token = req.headers.get("x-turnstile-token");
  if (!token || token.length > 2048) return false;
  try {
    const res = await fetch(verifyUrl(), {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("[turnstile] rejected:", data["error-codes"]);
    return data.success === true;
  } catch (err) {
    // If Cloudflare's check itself is down, let people through rather than break every tool.
    console.error("[turnstile] couldn't verify, allowing the request:", err);
    return true;
  }
}

export const notHuman = () =>
  Response.json({ error: "We couldn't confirm you're a person. Reload the page and try again." }, { status: 403 });
