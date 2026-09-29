import { expect, test } from "@playwright/test";
import { grabId } from "../helpers";

test.describe("timeline", () => {
  test("lists GIFs newest first and pages through them", async ({ request }) => {
    const older = await grabId(request, "111", "gifmaker");
    const newer = await grabId(request, "114", "multi");

    const page1 = await (await request.get("/api/gifs?limit=1")).json();
    expect(page1.items).toHaveLength(1);
    expect(page1.nextCursor).toEqual(expect.any(Number));

    const all: string[] = [];
    let cursor: number | null = null;
    do {
      const page: { items: { id: string }[]; nextCursor: number | null } =
        await (await request.get(`/api/gifs?limit=1${cursor ? `&before=${cursor}` : ""}`)).json();
      all.push(...page.items.map((g) => g.id));
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(new Set(all).size).toBe(all.length); // no repeats across pages
    expect(all.indexOf(newer)).toBeLessThan(all.indexOf(older));
  });

  test("home page and GIF page render, with link-preview tags", async ({ request }) => {
    const id = await grabId(request, "111", "gifmaker");
    expect(await (await request.get("/")).text()).toContain(`/g/${id}`);

    const html = await (await request.get(`/g/${id}`)).text();
    expect(html).toContain(`property="og:video" content="http://localhost:3299/media/${id}/source.mp4"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain("@<!-- -->gifmaker");

    expect((await request.get("/g/nope123456")).status()).toBe(404);
  });
});
