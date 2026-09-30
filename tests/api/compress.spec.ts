import fs from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { visitor } from "../helpers";

const fixture = (name: string) => fs.readFileSync(path.join(process.cwd(), "tests", ".fixtures", name));
const isGif = (b: Buffer) => b.subarray(0, 6).toString("latin1") === "GIF89a";
const gifWidth = (b: Buffer) => b.readUInt16LE(6);

function compress(request: APIRequestContext, body: Buffer, query: string) {
  return request.post(`/api/compress?${query}`, {
    data: body,
    headers: { ...visitor(), "content-type": "application/octet-stream" },
  });
}

test.describe("POST /api/compress", () => {
  test("shrinks a video into a GIF under the target, using most of the budget", async ({ request }) => {
    const target = 400_000;
    const res = await compress(request, fixture("big.mp4"), `target=${target}`);
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(isGif(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(target);
    expect(body.length).toBeGreaterThan(target * 0.6); // doesn't throw away quality it could keep
    expect(res.headers()["x-gifsuite-target-met"]).toBe("true");
    expect(res.headers()["content-disposition"]).toBe('attachment; filename="gifsuite-compressed.gif"');
    expect(Number(res.headers()["x-gifsuite-width"])).toBe(gifWidth(body));
  });

  test("respects the max width", async ({ request }) => {
    const res = await compress(request, fixture("big.mp4"), "target=5000000&width=320");
    expect(gifWidth(await res.body())).toBeLessThanOrEqual(320);
  });

  test("returns a GIF that already fits untouched", async ({ request }) => {
    const original = fixture("odd.gif");
    const res = await compress(request, original, "target=5000000");
    expect(res.headers()["x-gifsuite-unchanged"]).toBe("true");
    expect(Buffer.compare(await res.body(), original)).toBe(0);
  });

  test("says so when the target can't be reached, and still returns its best effort", async ({ request }) => {
    const res = await compress(request, fixture("big.mp4"), "target=20480");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-gifsuite-target-met"]).toBe("false");
    expect(isGif(await res.body())).toBe(true);
  });

  test("rejects bad targets, widths and files", async ({ request }) => {
    expect((await compress(request, fixture("odd.gif"), "target=5")).status()).toBe(400);
    expect((await compress(request, fixture("odd.gif"), "target=abc")).status()).toBe(400);
    expect((await compress(request, fixture("odd.gif"), "target=1000000&width=333")).status()).toBe(400);
    expect((await compress(request, Buffer.from("plain text, not media"), "target=1000000")).status()).toBe(415);
    expect((await compress(request, fixture("evil.gif"), "target=1000000")).status()).toBe(415);
    expect((await compress(request, fixture("long.mp4"), "target=1000000")).status()).toBe(413);
  });
});
