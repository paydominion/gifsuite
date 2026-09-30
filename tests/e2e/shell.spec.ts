import { expect, test } from "@playwright/test";

const cspViolations: string[] = [];
const fontHosts = new Set<string>();

test.beforeEach(async ({ page }) => {
  cspViolations.length = 0;
  fontHosts.clear();
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(msg.text())) cspViolations.push(msg.text());
  });
  page.on("request", (req) => {
    if (req.resourceType() === "font") fontHosts.add(new URL(req.url()).host);
  });
});

test.afterEach(() => {
  expect(cspViolations, "CSP blocked part of the app").toEqual([]);
});

test("the page is set in Satoshi, served from our own site", async ({ page, baseURL }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check("16px Satoshi"))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/satoshi/i);
  // No font requests to Google or any other outside host.
  expect([...fontHosts]).toEqual([new URL(baseURL!).host]);
});

test("the Tools menu opens, lists every tool, and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Tools", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: /Grab from X/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Screenshots to GIF/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();

  // Clicking outside closes it too.
  await toggle.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("the tools page shows which tools are live", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("link", { name: "See all tools →" }).click();
  await expect(page).toHaveURL("/tools");
  await expect(page.getByRole("heading", { name: "All tools" })).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(6);
  await page.getByRole("link", { name: /Grab from X/ }).click();
  await expect(page).toHaveURL("/");
});

test("an empty grab explains what to do", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Paste an X post link first." })).toBeVisible();
});

test("works at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("X post link")).toBeVisible();
  // Nothing sticks out sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
