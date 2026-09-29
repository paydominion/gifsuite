import { expect, test } from "@playwright/test";
import { deleteOnFakeX, grabId } from "../helpers";

// Never actually load X during tests: answer its URLs with a blank page.
test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/(x|twitter)\.com\//, (route) => route.fulfill({ body: "fake X page" }));
});

test("paste a link, grab the GIF, land on its page", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("X post link").fill("https://x.com/uiuser/status/115");
  await page.getByRole("button", { name: "Grab GIF" }).click();

  await expect(page).toHaveURL(/\/g\/[A-Za-z0-9]{10}$/);
  await expect(page.getByRole("link", { name: /UIUSER @uiuser/ })).toBeVisible();
  await expect(page.locator("video")).toBeVisible();
});

test("shows a clear error for a non-X link", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("X post link").fill("https://youtube.com/watch?v=1");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  // Next.js has its own (empty) role="alert" route announcer, so match on the text too.
  await expect(page.getByRole("alert").filter({ hasText: "Only X (Twitter) post links" })).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("download a low-quality GIF", async ({ page, request }) => {
  const id = await grabId(request, "115", "uiuser");
  await page.goto(`/g/${id}`);

  await page.getByRole("radio", { name: "Low" }).click();
  await expect(page.getByText(/320px · 10fps/)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /GIF Works everywhere/ }).click();
  expect((await download).suggestedFilename()).toBe(`uiuser-${id}-low.gif`);
  await expect(page.getByRole("status")).toHaveText(new RegExp(`Saved uiuser-${id}-low\\.gif \\(\\d+ (KB|MB)\\)`));
});

test("Post on X opens X with the original GIF and the caption", async ({ page, request }) => {
  const id = await grabId(request, "115", "uiuser");
  await page.goto(`/g/${id}`);

  const post = page.getByRole("button", { name: "Post on X" });
  await expect(post).toBeEnabled();
  await page.getByPlaceholder("Write your caption…").fill("this is me on monday");
  await expect(page.getByText(/credited “From @uiuser”/)).toBeVisible();

  const popup = page.waitForEvent("popup");
  await post.click();
  const x = await popup;
  await x.waitForURL(/x\.com\/intent\/post/);
  const url = new URL(x.url());
  expect(url.searchParams.get("url")).toBe("https://x.com/uiuser/status/115/video/1");
  expect(url.searchParams.get("text")).toBe("this is me on monday");
});

test("tells people to download when the original post is gone", async ({ page, request }) => {
  const id = await grabId(request, "116", "uivanish");
  await deleteOnFakeX(request, "116");
  await page.goto(`/g/${id}`);
  await expect(page.getByText("The original post is no longer on X")).toBeVisible();
  await expect(page.getByRole("button", { name: "Post on X" })).toHaveCount(0);
});

test("copy the page link", async ({ page, context, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const id = await grabId(request, "115", "uiuser");
  await page.goto(`/g/${id}`);
  await page.getByRole("button", { name: "Copy link to this page" }).click();
  await expect(page.getByText("Link copied!")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3299/g/${id}`);
});

test("timeline shows grabbed GIFs and opens them", async ({ page, request }) => {
  const id = await grabId(request, "115", "uiuser");
  await page.goto("/");
  const tile = page.locator(`a[href="/g/${id}"]`);
  await expect(tile).toContainText("@uiuser");
  await tile.click();
  await expect(page).toHaveURL(`/g/${id}`);
});
