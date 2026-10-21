import { expect, test } from "@playwright/test";
import { deleteOnFakeX, grabId } from "../helpers";

const cspViolations: string[] = [];

test.beforeEach(async ({ context, page }) => {
  // Never actually load X during tests: answer its URLs with a blank page.
  await context.route(/^https:\/\/(x|twitter)\.com\//, (route) => route.fulfill({ body: "fake X page" }));
  // The Content Security Policy must not block anything the app itself needs.
  cspViolations.length = 0;
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(msg.text())) cspViolations.push(msg.text());
  });
});

test.afterEach(() => {
  expect(cspViolations, "CSP blocked part of the app").toEqual([]);
});

test("paste a link, grab the GIF, land on its page", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GIF or post link").fill("https://x.com/uiuser/status/115");
  await page.getByRole("button", { name: "Grab GIF" }).click();

  await expect(page).toHaveURL(/\/g\/[A-Za-z0-9]{10}$/);
  await expect(page.getByRole("link", { name: /UIUSER @uiuser/ })).toBeVisible();
  await expect(page.locator("video")).toBeVisible();
});

test("takes a link without https:// or with words around it, and explains text that isn't a link", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GIF or post link").fill("look at this x.com/uiuser/status/115 lol");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  await expect(page).toHaveURL(/\/g\/[A-Za-z0-9]{10}$/);

  await page.goto("/");
  await page.getByLabel("GIF or post link").fill("not a link");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "doesn't look like a link" })).toBeVisible();
});

test("shows a clear error for a link with no GIF", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GIF or post link").fill("http://127.0.0.1:3298/page/nothing-here");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  // Next.js has its own (empty) role="alert" route announcer, so match on the text too.
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't find a GIF or video at that link." })).toBeVisible();
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

test("grab from another site, then share its page on X", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("GIF or post link").fill("http://127.0.0.1:3298/page/ui");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  await expect(page).toHaveURL(/\/g\/[A-Za-z0-9]{10}$/);
  await expect(page.getByRole("link", { name: /Fake Reddit on 127\.0\.0\.1/ })).toBeVisible();
  await expect(page.locator("video")).toBeVisible();

  await page.getByPlaceholder("Write your caption…").fill("found this");
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Post on X" }).click();
  const intent = new URL((await popup).url());
  expect(intent.pathname).toBe("/intent/post");
  expect(intent.searchParams.get("url")).toBe(page.url());
  expect(intent.searchParams.get("text")).toBe("found this");
});
