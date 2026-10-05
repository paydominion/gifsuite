import { expect, test } from "@playwright/test";
import { grab, visitor, waitForCheck } from "../helpers";

test.describe("POST /api/grab", () => {
  test("grabs the GIF from an X post and saves its details", async ({ request }) => {
    // Post 117 is only ever grabbed here, so it is always new.
    const { status, body } = await grab(request, "https://x.com/firstgrab/status/117/video/1?s=46");
    expect(status).toBe(200);
    expect(body.created).toBe(true);
    expect(body.id).toMatch(/^[A-Za-z0-9]{10}$/);

    await waitForCheck(body.id); // it joins the timeline once its background NSFW check passes
    const { items } = await (await request.get("/api/gifs")).json();
    const gif = items.find((g: { id: string }) => g.id === body.id);
    expect(gif).toMatchObject({
      tweetId: "117",
      mediaIndex: 0,
      mediaType: "animated_gif",
      authorHandle: "firstgrab",
      authorName: "FIRSTGRAB",
      tweetText: "grabbed exactly once, by the grab test", // trailing t.co media link removed
      tweetLikes: 1234,
      tweetUrl: "https://x.com/firstgrab/status/117",
      width: 320,
      height: 240,
      hidden: false,
    });
    expect(gif.durationMs).toBeGreaterThan(1800);
    expect(gif.durationMs).toBeLessThan(2200);
  });

  test("returns the same GIF for every form of the same post link", async ({ request }) => {
    const first = await grab(request, "https://x.com/gifmaker/status/111");
    for (const link of [
      "https://twitter.com/gifmaker/status/111",
      "mobile.twitter.com/gifmaker/status/111?s=20",
      "https://x.com/gifmaker/status/111/video/1",
    ]) {
      const again = await grab(request, link);
      expect(again).toEqual({ status: 200, body: { id: first.body.id, created: false, public: true } });
    }
  });

  test("finds the GIF when the post has a photo first", async ({ request }) => {
    const { body } = await grab(request, "https://x.com/multi/status/114");
    const { items } = await (await request.get("/api/gifs")).json();
    expect(items.find((g: { id: string }) => g.id === body.id)).toMatchObject({ mediaIndex: 1, width: 640 });
    // A link to the second media slot is the same GIF.
    expect((await grab(request, "https://x.com/multi/status/114/video/2")).body.id).toBe(body.id);
  });

  const failures: [string, number, RegExp][] = [
    ["", 400, /Paste a link first/],
    ["not a link", 400, /doesn't look like a link/],
    ["http://127.0.0.1:3298/page/nothing-here", 422, /Couldn't find a GIF or video/],
    ["https://x.com/someone", 400, /Couldn't find a post/],
    ["https://x.com/talker/status/200", 422, /no GIF or video/],
    ["https://x.com/ghost/status/999", 404, /doesn't exist/],
    ["https://x.com/ghost/status/405", 404, /unavailable/],
    ["https://x.com/longvid/status/600", 413, /longer than 60s/],
    ["https://x.com/down/status/500", 502, /Try again/],
  ];
  for (const [link, status, message] of failures) {
    test(`rejects ${link || "an empty link"} with ${status}`, async ({ request }) => {
      const res = await grab(request, link);
      expect(res.status).toBe(status);
      expect(res.body.error).toMatch(message);
    });
  }

  test("rate-limits one visitor to 10 grabs a minute", async ({ request }) => {
    const me = visitor();
    for (let i = 0; i < 10; i++) expect((await grab(request, "not a link", me)).status).toBe(400);
    expect((await grab(request, "not a link", me)).status).toBe(429);
    // Someone else is unaffected.
    expect((await grab(request, "not a link")).status).toBe(400);
  });
});
