import { expect, test } from "@playwright/test";
import { countEvents, grabId } from "../helpers";

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  gif: (b) => b.subarray(0, 6).toString("latin1") === "GIF89a",
  mp4: (b) => b.subarray(4, 8).toString("latin1") === "ftyp",
  webm: (b) => b.readUInt32BE(0) === 0x1a45dfa3,
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};
const MIME = { gif: "image/gif", mp4: "video/mp4", webm: "video/webm", webp: "image/webp" };

test.describe("GET /api/gif/[id]/download", () => {
  let id: string;
  test.beforeAll(async ({ request }) => {
    id = await grabId(request, "111", "gifmaker");
  });

  for (const quality of ["low", "medium", "high"]) {
    for (const format of ["gif", "mp4", "webm", "webp"] as const) {
      test(`${quality} ${format} is a real ${format} file`, async ({ request }) => {
        const res = await request.get(`/api/gif/${id}/download?format=${format}&quality=${quality}`);
        expect(res.status()).toBe(200);
        expect(res.headers()["content-type"]).toBe(MIME[format]);
        expect(res.headers()["content-disposition"]).toBe(`attachment; filename="gifmaker-${id}-${quality}.${format}"`);
        const body = await res.body();
        expect(body.length).toBeGreaterThan(1000);
        expect(MAGIC[format](body)).toBe(true);
      });
    }
  }

  test("quality changes the GIF's size", async ({ request }) => {
    const big = await grabId(request, "114", "multi"); // 640px wide source
    const widthOf = async (quality: string) => {
      const body = await (await request.get(`/api/gif/${big}/download?format=gif&quality=${quality}`)).body();
      return body.readUInt16LE(6); // GIF logical screen width
    };
    expect(await widthOf("low")).toBe(320);
    expect(await widthOf("medium")).toBe(480);
    expect(await widthOf("high")).toBe(640);
  });

  test("defaults to a medium GIF", async ({ request }) => {
    const res = await request.get(`/api/gif/${id}/download`);
    expect(res.headers()["content-disposition"]).toContain(`-medium.gif`);
  });

  test("records each download with its format and quality", async ({ request }) => {
    const before = countEvents(id, "download", "webm:low");
    await request.get(`/api/gif/${id}/download?format=webm&quality=low`);
    expect(countEvents(id, "download", "webm:low")).toBe(before + 1);
  });

  test("rejects unknown formats, qualities and GIFs", async ({ request }) => {
    expect((await request.get(`/api/gif/${id}/download?format=png`)).status()).toBe(400);
    expect((await request.get(`/api/gif/${id}/download?format=toString`)).status()).toBe(400);
    expect((await request.get(`/api/gif/${id}/download?quality=ultra`)).status()).toBe(400);
    expect((await request.get(`/api/gif/nope123456/download?format=gif`)).status()).toBe(404);
  });
});
