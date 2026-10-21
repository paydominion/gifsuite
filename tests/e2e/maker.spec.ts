import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = (name: string) => path.join(process.cwd(), "tests", ".fixtures", name);
const cspViolations: string[] = [];

test.beforeEach(async ({ page }) => {
  cspViolations.length = 0;
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(msg.text())) cspViolations.push(msg.text());
  });
});
test.afterEach(() => expect(cspViolations, "CSP blocked part of the app").toEqual([]));

test("make a slideshow GIF: add pictures, reorder, crossfade, download", async ({ page }) => {
  await page.goto("/tools/maker");
  await page.locator('input[type="file"]').setInputFiles([fixture("wide.png"), fixture("tall.jpg"), fixture("square.png")]);
  const pictures = page.getByRole("list", { name: "Pictures" }).getByRole("listitem");
  await expect(pictures).toHaveCount(3);
  await expect(page.getByText("3 pictures, in this order")).toBeVisible();

  // Move the last picture to the front.
  const firstBefore = await pictures.nth(0).getByRole("img").getAttribute("src");
  await page.getByRole("button", { name: "Move picture 3 earlier" }).click();
  await page.getByRole("button", { name: "Move picture 2 earlier" }).click();
  expect(await pictures.nth(1).getByRole("img").getAttribute("src")).toBe(firstBefore);

  await page.getByRole("radiogroup", { name: "Time per picture" }).getByRole("radio", { name: "0.2s" }).click();
  await page.getByRole("switch", { name: /Crossfade/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Make GIF" }).click();
  expect((await download).suggestedFilename()).toBe("gifsuite-maker.gif");
  await expect(page.getByRole("status")).toHaveText(/Saved gifsuite-maker\.gif \(\d+ KB\)/);
  await expect(page.getByRole("img", { name: "Your GIF" })).toBeVisible();
});

test("one picture gets an effect, and can be made as MP4", async ({ page }) => {
  await page.goto("/gif-maker");
  await page.locator('input[type="file"]').setInputFiles(fixture("tall.jpg"));
  await expect(page.getByRole("radiogroup", { name: "Effect" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Time per picture" })).toHaveCount(0);
  await page.getByRole("radiogroup", { name: "Effect" }).getByRole("radio", { name: "Pulse" }).click();
  await page.getByRole("radiogroup", { name: "Length" }).getByRole("radio", { name: "2s" }).click();
  await page.getByRole("radiogroup", { name: "Format" }).getByRole("radio", { name: "MP4" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Make MP4" }).click();
  expect((await download).suggestedFilename()).toBe("gifsuite-maker.mp4");

  // Removing the picture empties the list.
  await page.getByRole("button", { name: "Remove picture 1" }).click();
  await expect(page.getByRole("list", { name: "Pictures" })).toHaveCount(0);
});

test("only pictures are accepted", async ({ page }) => {
  await page.goto("/tools/maker");
  await page.locator('input[type="file"]').setInputFiles(fixture("dog.mp4"));
  // A video gets pointed to the tool that handles videos.
  await expect(page.getByRole("alert").filter({ hasText: "To turn a video into a GIF, use Upload & convert." })).toBeVisible();
});

test("on a phone, picture buttons are big enough for a thumb and nothing overflows", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/tools/maker");
  await page.locator('input[type="file"]').setInputFiles([fixture("wide.png"), fixture("tall.jpg"), fixture("square.png")]);
  for (const name of ["Remove picture 2", "Move picture 2 earlier", "Move picture 2 later"]) {
    const box = (await page.getByRole("button", { name }).boundingBox())!;
    expect(box.height, name).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await context.close();
});
