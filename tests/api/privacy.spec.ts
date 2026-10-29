import { expect, test, type APIRequestContext } from "@playwright/test";
import { ADMIN_TOKEN, gifRow, grab, timelineIds, visitor, waitForCheck } from "../helpers";

const setPublic = (request: APIRequestContext, id: string, value: unknown, headers: Record<string, string> = {}) =>
  request.post(`/api/gif/${id}/visibility`, { data: { public: value }, headers });

const grabPrivate = async (request: APIRequestContext, url: string) =>
  (await request.post("/api/grab", { data: { url, public: false }, headers: visitor() })).json();

test.describe("public / private", () => {
  test("GIFs are public by default and join the timeline once checked", async ({ request }) => {
    const { body } = await grab(request, "https://x.com/gifmaker/status/111");
    expect(body.public).toBe(true);
    await waitForCheck(body.id);
    expect(await timelineIds(request)).toContain(body.id);
  });

  test("a private grab stays off the timeline and isn't scanned, but its link still works", async ({ request }) => {
    const body = await grabPrivate(request, "https://x.com/quiet/status/119");
    expect(body).toMatchObject({ created: true, public: false });
    expect(gifRow(body.id).is_public).toBe(0);

    expect(await timelineIds(request)).not.toContain(body.id);
    expect(await (await request.get("/")).text()).not.toContain(`/g/${body.id}`);
    const page = await request.get(`/g/${body.id}`);
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    // Sharing doesn't wait for a check: the link preview is there.
    expect(html).toContain('property="og:video"');

    // The sweep only scans public GIFs, so this one stays unchecked.
    expect((await request.post("/api/admin/scan-pending", { headers: { "x-admin-token": ADMIN_TOKEN } })).status()).toBe(200);
    expect(gifRow(body.id).nsfw).toBeNull();
  });

  test("a stranger grabbing the same link never gets someone's private GIF", async ({ request, playwright, baseURL }) => {
    const stranger = await playwright.request.newContext({ baseURL });
    try {
      for (const url of ["https://x.com/secretive/status/130", "http://127.0.0.1:3298/files/clip.webm?v=privacy"]) {
        const mine = await grabPrivate(request, url);
        expect(mine, url).toMatchObject({ created: true, public: false });
        // The same browser grabbing again gets its own GIF back.
        expect((await grabPrivate(request, url)).id, url).toBe(mine.id);

        const theirs = await (await stranger.post("/api/grab", { data: { url }, headers: visitor() })).json();
        expect(theirs.id, url).not.toBe(mine.id);
        expect(theirs, url).toMatchObject({ created: true, public: true });
        // Their public copy is the one everyone else gets from now on.
        const third = await (await playwright.request.newContext({ baseURL })).post("/api/grab", { data: { url }, headers: visitor() });
        expect((await third.json()).id, url).toBe(theirs.id);
      }
    } finally {
      await stranger.dispose();
    }
  });

  test("a private GIF made public is checked, then joins the timeline", async ({ request }) => {
    const body = await grabPrivate(request, "https://x.com/latebloomer/status/125");
    expect(gifRow(body.id).nsfw).toBeNull();

    expect((await setPublic(request, body.id, true)).status()).toBe(200);
    await waitForCheck(body.id);
    expect(gifRow(body.id)).toMatchObject({ is_public: 1, nsfw: 0, nsfw_source: "scan" });
    expect(await timelineIds(request)).toContain(body.id);
  });

  test("only the browser that grabbed a GIF can switch it between public and private", async ({ request, playwright, baseURL }) => {
    // `request` keeps cookies between calls, like a browser.
    const res = await request.post("/api/grab", { data: { url: "https://x.com/switcher/status/120" }, headers: visitor() });
    const id = (await res.json()).id;
    await waitForCheck(id);

    // It gets an owner key; only a hash of it is stored.
    const cookie = res.headers()["set-cookie"];
    expect(cookie).toMatch(/gs_owner=[A-Za-z0-9_-]{43};/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    const key = cookie.match(/gs_owner=([^;]+)/)![1];
    expect(gifRow(id).owner_key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(gifRow(id).owner_key_hash).not.toContain(key);

    expect((await setPublic(request, id, false)).status()).toBe(200);
    expect(gifRow(id).is_public).toBe(0);
    expect(await timelineIds(request)).not.toContain(id);

    expect((await setPublic(request, id, true)).status()).toBe(200);
    expect(await timelineIds(request)).toContain(id);

    // Someone else (no cookie, their own different key, or a made-up one) can't.
    const stranger = await playwright.request.newContext({ baseURL });
    expect((await setPublic(stranger, id, false)).status()).toBe(403);
    await grab(stranger, "https://x.com/gifmaker/status/111");
    expect((await setPublic(stranger, id, false)).status()).toBe(403);
    expect((await setPublic(stranger, id, false, { cookie: `gs_owner=${"A".repeat(43)}` })).status()).toBe(403);
    // Grabbing the same post again doesn't make them an owner, or change its visibility.
    const again = await (await stranger.post("/api/grab", { data: { url: "https://x.com/switcher/status/120", public: false }, headers: visitor() })).json();
    expect(again).toMatchObject({ id, created: false, public: true });
    expect((await setPublic(stranger, id, false)).status()).toBe(403);
    await stranger.dispose();
    expect(gifRow(id).is_public).toBe(1);
  });

  test("rejects bad visibility requests", async ({ request }) => {
    const { body } = await grab(request, "https://x.com/switcher/status/120");
    expect((await setPublic(request, body.id, "yes")).status()).toBe(400);
    expect((await setPublic(request, "nope123456", true)).status()).toBe(404);
    expect((await setPublic(request, body.id, true, { origin: "https://evil.example" })).status()).toBe(403);
    expect((await request.post("/api/grab", { data: { url: "https://x.com/a/status/111", public: "no" }, headers: visitor() })).status()).toBe(400);
  });
});

test.describe("NSFW filter", () => {
  test("a public grab is scanned after the response; ordinary clips pass", async ({ request }) => {
    const { status, body } = await grab(request, "https://x.com/scanned/status/124");
    expect(status).toBe(200);
    // Download works straight away, whether or not the check has finished.
    expect((await request.get(`/api/gif/${body.id}/download?format=gif&quality=low`)).status()).toBe(200);

    await waitForCheck(body.id);
    const row = gifRow(body.id);
    expect(row).toMatchObject({ nsfw: 0, nsfw_source: "scan" });
    expect(row.nsfw_score).toBeGreaterThanOrEqual(0);
    expect(row.nsfw_score).toBeLessThan(0.6);
  });

  test("a post X marks sensitive is flagged at once: off the timeline, no link preview, not indexed", async ({ request }) => {
    const { status, body } = await grab(request, "https://x.com/spicy/status/118");
    expect(status).toBe(200);
    expect(gifRow(body.id)).toMatchObject({ nsfw: 1, nsfw_source: "x" });
    expect(await timelineIds(request)).not.toContain(body.id);

    const html = await (await request.get(`/g/${body.id}`)).text();
    expect(html).toContain("Sensitive content");
    expect(html).not.toContain('property="og:image"');
    expect(html).not.toContain('property="og:video"');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    // Even when its grabber makes it public.
    expect((await setPublic(request, body.id, true)).status()).toBe(200);
    expect(await timelineIds(request)).not.toContain(body.id);
    // Downloads still work for the person who wanted it.
    expect((await request.get(`/api/gif/${body.id}/download?format=gif&quality=low`)).status()).toBe(200);
  });

  test("an admin can clear a false positive, with the admin token only", async ({ request }) => {
    const { body } = await grab(request, "https://x.com/cleared/status/123");
    const clear = (token: string) => request.post("/api/admin/nsfw", { data: { gifId: body.id, nsfw: false }, headers: { "x-admin-token": token } });
    expect((await clear("wrong")).status()).toBe(401);
    expect(await timelineIds(request)).not.toContain(body.id);

    expect((await clear(ADMIN_TOKEN)).status()).toBe(200);
    expect(gifRow(body.id)).toMatchObject({ nsfw: 0, nsfw_source: "admin" });
    expect(await timelineIds(request)).toContain(body.id);
  });

  test("the retry sweep needs the admin token", async ({ request }) => {
    expect((await request.post("/api/admin/scan-pending")).status()).toBe(401);
    expect((await request.post("/api/admin/scan-pending", { headers: { "x-admin-token": "wrong" } })).status()).toBe(401);
    const res = await request.post("/api/admin/scan-pending", { headers: { "x-admin-token": ADMIN_TOKEN } });
    expect(await res.json()).toEqual({ scanned: expect.any(Number), failed: 0 });
  });
});
