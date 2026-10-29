import { expect, test } from "@playwright/test";
import { ADMIN_TOKEN, countEvents, grabId, visitor } from "../helpers";

const send = (request: import("@playwright/test").APIRequestContext, data: object, headers = visitor()) =>
  // Browsers send these with sendBeacon as text/plain.
  request.post("/api/events", { data: JSON.stringify(data), headers: { ...headers, "content-type": "text/plain" } });

test.describe("events, reports and moderation", () => {
  test("records views and shares", async ({ request }) => {
    const id = await grabId(request, "111", "gifmaker");
    const before = countEvents(id, "share", "x-original");
    expect((await send(request, { gifId: id, type: "share", detail: "x-original" })).status()).toBe(204);
    expect((await send(request, { gifId: id, type: "view" })).status()).toBe(204);
    expect(countEvents(id, "share", "x-original")).toBe(before + 1);
  });

  test("rejects bad events", async ({ request }) => {
    const id = await grabId(request, "111", "gifmaker");
    expect((await send(request, { gifId: id, type: "download" })).status()).toBe(400); // only the server records downloads
    expect((await send(request, { gifId: id, type: "hack" })).status()).toBe(400);
    expect((await send(request, { type: "view" })).status()).toBe(400);
    expect((await send(request, { gifId: "nope123456", type: "view" })).status()).toBe(404);
    expect((await request.post("/api/events", { data: "not json", headers: { "content-type": "text/plain" } })).status()).toBe(400);
  });

  test("accepts browser-only events without a GIF, and rejects empty ones", async ({ request }) => {
    expect((await send(request, { type: "ui", detail: "file:mp4", path: "/tools/convert" })).status()).toBe(204);
    expect((await send(request, { type: "client_error", detail: "boom https://evil.example/x", path: "/" })).status()).toBe(204);
    expect((await send(request, { type: "ui" })).status()).toBe(400);
    expect((await send(request, { type: "ui", detail: "   " })).status()).toBe(400);
  });

  test("hides a GIF after reports from 3 different people, not 3 from one", async ({ request }) => {
    const id = await grabId(request, "112", "reporter");
    const troll = visitor();
    for (let i = 0; i < 3; i++) await send(request, { gifId: id, type: "report" }, troll);
    expect((await request.get(`/g/${id}`)).status()).toBe(200);

    await send(request, { gifId: id, type: "report" });
    await send(request, { gifId: id, type: "report" });
    expect((await request.get(`/g/${id}`)).status()).toBe(404);
    expect((await request.get(`/api/gif/${id}/download`)).status()).toBe(404);
    const { items } = await (await request.get("/api/gifs?limit=60")).json();
    expect(items.map((g: { id: string }) => g.id)).not.toContain(id);
  });

  test("one person can't pass for several by changing their browser name", async ({ request }) => {
    const id = await grabId(request, "127", "uaswapper");
    const ip = visitor()["x-forwarded-for"];
    for (let i = 0; i < 5; i++) await send(request, { gifId: id, type: "report" }, { "x-forwarded-for": ip, "user-agent": `ua-${i}` });
    expect((await request.get(`/g/${id}`)).status()).toBe(200);
  });

  test("reports sent from another site are refused", async ({ request }) => {
    const id = await grabId(request, "128", "crosssite");
    const res = await send(request, { gifId: id, type: "report" }, { ...visitor(), "sec-fetch-site": "cross-site" });
    expect(res.status()).toBe(403);
  });

  test("after an admin restores a GIF, it takes a fresh set of reports to hide it again", async ({ request }) => {
    const id = await grabId(request, "129", "restored");
    const people = [visitor(), visitor(), visitor()];
    for (const p of people) await send(request, { gifId: id, type: "report" }, p);
    expect((await request.get(`/g/${id}`)).status()).toBe(404);

    const restore = await request.post("/api/admin/hide", { data: { gifId: id, hidden: false }, headers: { "x-admin-token": ADMIN_TOKEN } });
    expect(restore.status()).toBe(200);
    await send(request, { gifId: id, type: "report" }, people[0]);
    await send(request, { gifId: id, type: "report" }, people[1]);
    expect((await request.get(`/g/${id}`)).status()).toBe(200);
    await send(request, { gifId: id, type: "report" }, people[2]);
    expect((await request.get(`/g/${id}`)).status()).toBe(404);
  });

  test("admin hide needs the admin token", async ({ request }) => {
    const id = await grabId(request, "111", "gifmaker");
    const hide = (hidden: boolean, token?: string) =>
      request.post("/api/admin/hide", { data: { gifId: id, hidden }, headers: token ? { "x-admin-token": token } : {} });

    expect((await hide(true)).status()).toBe(401);
    expect((await hide(true, "wrong-token")).status()).toBe(401);
    try {
      expect((await hide(true, ADMIN_TOKEN)).status()).toBe(200);
      expect((await request.get(`/g/${id}`)).status()).toBe(404);
    } finally {
      expect((await hide(false, ADMIN_TOKEN)).status()).toBe(200);
    }
    expect((await request.get(`/g/${id}`)).status()).toBe(200);
  });
});
