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
  await expect(page.getByRole("link", { name: /Grab from any link/ })).toBeVisible();
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
  await page.getByRole("link", { name: /Grab from any link/ }).click();
  await expect(page).toHaveURL("/");
});

test("a missing page shows our own 404, styled and without CSP errors", async ({ page }) => {
  for (const path of ["/no-such-page", "/blog/no-such-post", "/g/nope123456"]) {
    const res = await page.goto(path);
    expect(res!.status(), path).toBe(404);
    await expect(page.getByRole("heading", { name: "This page didn't loop back." }), path).toBeVisible();
    await expect(page.getByRole("link", { name: "Grab a GIF" }).last()).toBeVisible();
  }
});

test("the analytics beacon is allowed to load: requested, and no CSP errors", async ({ page }) => {
  const beacon = page.waitForRequest(/static\.cloudflareinsights\.com\/beacon\.min\.js/);
  await page.goto("/tools");
  await beacon; // the browser tried it (it resolves to nowhere in tests); afterEach checks no CSP error
});

test("the legal pages are linked from every page and from each other", async ({ page }) => {
  await page.goto("/tools");
  const footer = page.getByRole("contentinfo");
  for (const [name, heading] of [["Terms", "Terms"], ["Privacy", "Privacy"], ["Copyright", "Copyright & takedowns"]]) {
    await footer.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: "legal@gifsuite.com" }).first()).toHaveAttribute("href", "mailto:legal@gifsuite.com");
  }
  await page.getByRole("navigation", { name: "Legal pages" }).getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL("/privacy");
});

test("an empty grab explains what to do", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Paste a link first." })).toBeVisible();
});

// Every page must fit these phone widths with nothing sticking out sideways.
const PHONE_WIDTHS = [320, 360, 390];
const PAGES = ["/", "/tools", "/tools/convert", "/tools/compress", "/blog", "/blog/gif-vs-mp4-vs-webm-vs-webp", "/brand", "/terms", "/privacy", "/copyright"];

for (const width of PHONE_WIDTHS) {
  test(`every page fits a ${width}px phone`, async ({ browser, request }) => {
    const { grabId } = await import("../helpers");
    const id = await grabId(request, "115", "uiuser");
    const context = await browser.newContext({ viewport: { width, height: 700 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    for (const path of [...PAGES, `/g/${id}`]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} is ${overflow}px wider than a ${width}px screen`).toBeLessThanOrEqual(0);
    }
    await context.close();
  });
}

test("the phone menu reaches every destination, with tap targets big enough for a thumb", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/");

  // The desktop links and the header button are gone; one menu button replaces them.
  await expect(page.getByRole("button", { name: "Tools", exact: true })).toBeHidden();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Grab a GIF" })).toBeHidden();
  const menu = page.getByRole("button", { name: "Open menu" });
  expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  await menu.click();
  for (const name of ["Grab from any link", "Upload & convert", "Compress & resize", "Blog", "Latest GIFs", "All tools"]) {
    const link = page.getByRole("navigation").getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height, name).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole("navigation").getByRole("link", { name: "Compress & resize", exact: true }).click();
  await expect(page).toHaveURL("/tools/compress");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible(); // it closed itself

  // Primary actions are thumb-sized on a touch screen.
  expect((await page.getByRole("button", { name: "Compress & download" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await context.close();
});

test("the brand page shows six logo options and downloads one as an SVG", async ({ page }) => {
  await page.goto("/brand");
  await expect(page.getByRole("img", { name: /logo$/ })).toHaveCount(6);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).first().click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("gifsuite-burst-loop.svg");
  const svg = await (await import("node:fs/promises")).readFile((await file.path())!, "utf8");
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain("#ffdc4a");
  expect(svg).not.toContain("currentColor");
  expect(svg).not.toContain("var(");
});
