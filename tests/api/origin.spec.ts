import { expect, test } from "@playwright/test";
import { deleteOnFakeX, grabId } from "../helpers";

test.describe("GET /api/gif/[id]/origin", () => {
  test("gives X's link to the original GIF while the post is up", async ({ request }) => {
    const id = await grabId(request, "111", "gifmaker");
    expect(await (await request.get(`/api/gif/${id}/origin`)).json()).toEqual({
      available: true,
      mediaUrl: "https://x.com/gifmaker/status/111/video/1",
    });
  });

  test("points at the right media slot", async ({ request }) => {
    const id = await grabId(request, "114", "multi");
    expect((await (await request.get(`/api/gif/${id}/origin`)).json()).mediaUrl).toBe(
      "https://x.com/multi/status/114/video/2",
    );
  });

  test("reports the original as gone once the post is deleted", async ({ request }) => {
    const id = await grabId(request, "113", "vanishing");
    await deleteOnFakeX(request, "113");
    expect(await (await request.get(`/api/gif/${id}/origin`)).json()).toEqual({ available: false, mediaUrl: null });
    // The GIF itself stays in the library.
    expect((await request.get(`/g/${id}`)).status()).toBe(200);
  });

  test("404s for unknown GIFs", async ({ request }) => {
    expect((await request.get("/api/gif/nope123456/origin")).status()).toBe(404);
  });
});
