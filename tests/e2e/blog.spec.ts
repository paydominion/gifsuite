import { expect, test } from "@playwright/test";

const cspViolations: string[] = [];

test.beforeEach(async ({ page }) => {
  cspViolations.length = 0;
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(msg.text())) cspViolations.push(msg.text());
  });
});
test.afterEach(() => expect(cspViolations, "CSP blocked part of the app").toEqual([]));

test("read a post from the blog and follow it to the tool", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page).toHaveURL("/blog");
  await expect(page.getByRole("heading", { name: "Blog", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: /5 ways to make a GIF smaller/ }).click();
  await expect(page).toHaveURL("/blog/how-to-make-a-gif-smaller");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("5 ways to make a GIF smaller without wrecking it");
  await expect(page.getByRole("heading", { name: "1. Make it shorter" })).toBeVisible();
  await expect(page.getByText(/min read/)).toBeVisible();

  // The "try the tool" box at the end of the post.
  await page.getByRole("link", { name: "Open the free tool" }).click();
  await expect(page).toHaveURL("/tools/compress");
});

test("a post with a table fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog/gif-vs-mp4-vs-webm-vs-webp");
  await expect(page.getByRole("table")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
