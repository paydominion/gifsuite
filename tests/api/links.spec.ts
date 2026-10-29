import { expect, test } from "@playwright/test";
import { gifRow, grab, timelineIds, waitForCheck } from "../helpers";

// Fake sites on the fake X server (tests/fake-x/server.mjs): direct files under /files/ and pages
// under /page/ that tests/fake-ytdlp.mjs understands. The real yt-dlp and real sites are checked by
// hand on staging (TESTING.md).
const SITE = "http://127.0.0.1:3298";

test.describe("grab from any link", () => {
  test("a direct GIF link becomes a GIF page with every download", async ({ request }) => {
    const { status, body } = await grab(request, `${SITE}/files/odd.gif`);
    expect(status).toBe(200);
    expect(body.created).toBe(true);

    const html = await (await request.get(`/g/${body.id}`)).text();
    expect(html).toContain("View on 127.0.0.1");
    expect(html).not.toContain("likes on X");
    for (const format of ["gif", "mp4", "webm"]) {
      const res = await request.get(`/api/gif/${body.id}/download?format=${format}&quality=low`);
      expect(res.status(), format).toBe(200);
    }
    // There's no original X post to embed.
    expect(await (await request.get(`/api/gif/${body.id}/origin`)).json()).toMatchObject({ available: false, reason: "not-from-x" });
  });

  test("the same link pasted again, with tracking junk or in a sentence, is the same GIF", async ({ request }) => {
    const first = await grab(request, `${SITE}/files/clip.webm`);
    expect(first.status).toBe(200);
    for (const again of [`${SITE}/files/clip.webm?utm_source=share&s=20`, `look at this: ${SITE}/files/clip.webm.`, `"${SITE}/files/clip.webm#t=2"`]) {
      const res = await grab(request, again);
      expect(res.body, again).toMatchObject({ id: first.body.id, created: false });
    }
  });

  test("a redirect to a file is followed", async ({ request }) => {
    const { status } = await grab(request, `${SITE}/redirect-ok`);
    expect(status).toBe(200);
  });

  test("a page link is downloaded with the site's details", async ({ request }) => {
    const { status, body } = await grab(request, `${SITE}/page/clip`);
    expect(status).toBe(200);
    await waitForCheck(body.id);
    expect(gifRow(body.id)).toMatchObject({ nsfw: 0, nsfw_source: "scan" });
    expect(await timelineIds(request)).toContain(body.id);

    const { items } = await (await request.get("/api/gifs?limit=60")).json();
    expect(items.find((g: { id: string }) => g.id === body.id)).toMatchObject({
      source: "127.0.0.1",
      authorName: "Fake Giphy",
      tweetText: "A dancing test pattern",
      tweetUrl: `${SITE}/page/clip`,
      tweetLikes: 42,
      width: 480,
      height: 360,
    });
  });

  test("a site's 18+ label flags it at once, like X's sensitive mark", async ({ request }) => {
    const { status, body } = await grab(request, `${SITE}/page/adult`);
    expect(status).toBe(200);
    expect(gifRow(body.id)).toMatchObject({ nsfw: 1, nsfw_source: "site" });
    expect(await timelineIds(request)).not.toContain(body.id);
    expect(await (await request.get(`/g/${body.id}`)).text()).toContain("Sensitive content");
  });

  const failures: [string, number, RegExp][] = [
    [`${SITE}/page/nothing-here`, 422, /Couldn't find a GIF or video/],
    [`${SITE}/files/notes.txt`, 422, /Couldn't find a GIF or video/],
    [`${SITE}/files/anim.webp`, 415, /Animated WebP links aren't supported yet/],
    [`${SITE}/page/login`, 403, /signed-in users/],
    [`${SITE}/files/missing.gif`, 404, /Nothing is at that link/],
    [`${SITE}/files/huge.mp4`, 413, /too large/],
    [`${SITE}/files/long.mp4`, 413, /longer than 60s/],
    ["ftp://example.com/cat.gif", 400, /doesn't look like a link/],
  ];
  for (const [link, status, message] of failures) {
    test(`rejects ${link} with ${status}`, async ({ request }) => {
      const res = await grab(request, link);
      expect(res.status).toBe(status);
      expect(res.body.error).toMatch(message);
    });
  }

  // The server fetches what visitors paste, so it must never reach private or internal addresses.
  for (const link of [
    "http://127.0.0.1:3296/health", // the media processor itself
    "http://localhost:3298/files/odd.gif",
    "http://169.254.169.254/latest/meta-data/", // cloud metadata
    "http://[::1]:3298/files/odd.gif",
    "http://10.0.0.1/cat.gif",
    `${SITE}/redirect-private`, // a public-looking link that redirects inward
    `${SITE}/og-private`, // a page whose preview video is on a private address (must not reach yt-dlp)
  ]) {
    test(`refuses the private address ${link}`, async ({ request }) => {
      const res = await grab(request, link);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/private address/);
    });
  }
});
