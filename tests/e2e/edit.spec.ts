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

test("trim a video: set start and end, download the part", async ({ page }) => {
  await page.goto("/tools/trim");
  await page.locator('input[type="file"]').setInputFiles(fixture("sound.mp4"));
  await expect(page.getByText(/from 0\.0s to 4\.0s of 4\.0s/)).toBeVisible();
  await page.getByLabel("Start").fill("1000");
  await page.getByLabel("End").fill("2500");
  await expect(page.getByText(/from 1\.0s to 2\.5s/)).toBeVisible();
  // A video starts as MP4, which keeps the sound.
  await expect(page.getByRole("radiogroup", { name: "Format" }).getByRole("radio", { name: "MP4" })).toHaveAttribute("aria-checked", "true");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Trim & download" }).click();
  expect((await download).suggestedFilename()).toBe("sound-trimmed.mp4");
});

test("trim a GIF: its length comes from the server", async ({ page }) => {
  await page.goto("/gif-cutter");
  await page.locator('input[type="file"]').setInputFiles(fixture("odd.gif"));
  await expect(page.getByText(/of 2\.0s/)).toBeVisible();
  await page.getByLabel("End").fill("1000");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Trim & download" }).click();
  expect((await download).suggestedFilename()).toBe("odd-trimmed.gif");
});

test("speed & reverse: boomerang at 2×, and the 20-second limit is explained up front", async ({ page }) => {
  await page.goto("/tools/speed");
  await page.locator('input[type="file"]').setInputFiles(fixture("sound.mp4"));
  await page.getByRole("radiogroup", { name: "Speed" }).getByRole("radio", { name: "2×" }).click();
  await page.getByRole("radiogroup", { name: "Direction" }).getByRole("radio", { name: "Boomerang" }).click();
  await expect(page.getByText("New length: 4.0s")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Apply & download" }).click();
  expect((await download).suggestedFilename()).toBe("sound-speed.mp4");

  await page.getByRole("button", { name: "Choose another" }).click();
  await page.locator('input[type="file"]').setInputFiles(fixture("mid.mp4"));
  await expect(page.getByText(/work on clips up to 20 seconds/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply & download" })).toBeDisabled();
});

test("the reverse-gif page opens with Reverse chosen", async ({ page }) => {
  await page.goto("/reverse-gif");
  await expect(page.getByRole("radiogroup", { name: "Direction" }).getByRole("radio", { name: "Reverse" })).toHaveAttribute("aria-checked", "true");
});

test("add text: live preview, then download", async ({ page }) => {
  await page.goto("/tools/captions");
  await page.locator('input[type="file"]').setInputFiles(fixture("odd.gif"));
  const button = page.getByRole("button", { name: "Add text & download" });
  await expect(page.getByLabel("Caption preview")).toBeVisible();
  await expect(button).toBeDisabled(); // nothing to add yet
  await page.getByLabel("Top text").fill("when the gif loads");
  await page.getByLabel("Bottom text").fill("first try");
  // The preview canvas now has text drawn on it.
  const painted = await page.getByLabel("Caption preview").evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  expect(painted).toBeGreaterThan(500);
  const download = page.waitForEvent("download");
  await button.click();
  expect((await download).suggestedFilename()).toBe("odd-captioned.gif");
});

test("on a phone, the edit tools fit and the 8 speeds wrap", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  for (const p of ["/tools/speed", "/tools/trim", "/tools/captions"]) {
    await page.goto(p);
    await page.locator('input[type="file"]').setInputFiles(fixture("sound.mp4"));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), p).toBeLessThanOrEqual(0);
  }
  await context.close();
});
