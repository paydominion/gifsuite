import { expect, test } from "@playwright/test";
import { grabId } from "../helpers";

test.describe("GET /media/[id]/[file]", () => {
  let id: string;
  test.beforeAll(async ({ request }) => {
    id = await grabId(request, "111", "gifmaker");
  });

  test("serves the source, timeline preview and poster", async ({ request }) => {
    for (const [file, type] of [["source.mp4", "video/mp4"], ["preview.mp4", "video/mp4"], ["poster.jpg", "image/jpeg"]]) {
      const res = await request.get(`/media/${id}/${file}`);
      expect(res.status(), file).toBe(200);
      expect(res.headers()["content-type"]).toBe(type);
      expect(res.headers()["accept-ranges"]).toBe("bytes");
    }
  });

  test("supports byte ranges, which iPhones need to play video", async ({ request }) => {
    const res = await request.get(`/media/${id}/source.mp4`, { headers: { range: "bytes=0-99" } });
    expect(res.status()).toBe(206);
    expect(res.headers()["content-range"]).toMatch(/^bytes 0-99\/\d+$/);
    expect((await res.body()).length).toBe(100);

    const outside = await request.get(`/media/${id}/source.mp4`, { headers: { range: "bytes=99999999-" } });
    expect(outside.status()).toBe(416);
  });

  test("only serves known files and never escapes the media folder", async ({ request }) => {
    for (const path of [
      `/media/${id}/out-medium.gif`,
      `/media/${id}/..%2F..%2Fgifsuite.db`,
      `/media/..%2F..%2Fpackage.json/source.mp4`,
      `/media/${id}/%2e%2e%2f%2e%2e%2fgifsuite.db`,
      `/media/nope123456/source.mp4`,
    ]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });
});
