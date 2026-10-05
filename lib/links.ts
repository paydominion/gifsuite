import crypto from "node:crypto";

/** A pasted link to anything other than X, ready to fetch, or null if there's no web link in the text. */
export function extractLink(input: string): URL | null {
  const text = input.trim();
  const web = text.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
  // Another scheme (ftp://, file://…) is not a web link; don't guess one out of it.
  if (!web && /\b[a-z][a-z0-9+.-]*:\/\//i.test(text)) return null;
  const found = web ?? text.match(/(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s"'<>]*/i)?.[0];
  if (!found) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(found) ? found : `https://${found}`);
    // Trailing punctuation from a sentence ("…/cat.gif.") isn't part of the link.
    url.pathname = url.pathname.replace(/[.,;:!?)]+$/, "");
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

// Query parameters that only track where a link was shared from; they don't change what it points at.
const TRACKING = /^(utm_\w+|fbclid|gclid|igshid|si|s|t|ref|ref_src|ref_url|share_id|context|feature)$/i;

/** The same link written one way, so the same GIF pasted twice is only stored once. */
export function normalizeLink(url: URL): string {
  const u = new URL(url.href);
  u.protocol = "https:";
  u.hostname = u.hostname.toLowerCase().replace(/^(?:www|m|mobile|old|new)\./, "");
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  return u.href;
}

/** The de-duplication key stored in place of an X post id: "url:" + a hash of the normalised link. */
export function linkKey(url: URL): string {
  return `url:${crypto.createHash("sha256").update(normalizeLink(url)).digest("hex").slice(0, 24)}`;
}

/** The site's name for display and analytics: "giphy.com", "reddit.com". */
export function siteName(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(?:www|m|mobile|old|new|media\d*|i|v)\./, "");
}
