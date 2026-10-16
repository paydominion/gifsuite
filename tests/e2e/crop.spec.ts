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

test("crop a video: pick a shape, drag the box, nudge it with the keyboard, download", async ({ page }) => {
  await page.goto("/tools/crop");
  await page.locator('input[type="file"]').setInputFiles(fixture("big.mp4")); // 640×480
  const box = page.getByRole("slider", { name: "Crop box" });
  await expect(box).toHaveAttribute("aria-valuetext", "512 by 384 pixels, at 64, 48");
  // A video starts as MP4.
  await expect(page.getByRole("radiogroup", { name: "Format" }).getByRole("radio", { name: "MP4" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radiogroup", { name: "Shape" }).getByRole("radio", { name: "1:1" }).click();
  await expect(box).toHaveAttribute("aria-valuetext", "480 by 480 pixels, at 80, 0");
  await expect(page.getByText("Crop: 480×480 pixels")).toBeVisible();

  // Drag it left by a lot: it stops at the picture's edge.
  await box.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const bb = (await box.boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x - 400, bb.y + bb.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(box).toHaveAttribute("aria-valuetext", "480 by 480 pixels, at 0, 0");

  await box.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(box).toHaveAttribute("aria-valuetext", /at 64, 0$/);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Crop & download" }).click();
  expect((await download).suggestedFilename()).toBe("big-cropped.mp4");
  await expect(page.getByRole("status")).toHaveText(/Saved big-cropped\.mp4/);
});

test("resizing from a corner keeps a locked shape", async ({ page }) => {
  await page.goto("/gif-cropper");
  await page.locator('input[type="file"]').setInputFiles(fixture("odd.gif")); // 301×201
  await expect(page.getByRole("radiogroup", { name: "Format" }).getByRole("radio", { name: "GIF" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radiogroup", { name: "Shape" }).getByRole("radio", { name: "1:1" }).click();
  const box = page.getByRole("slider", { name: "Crop box" });
  await expect(box).toHaveAttribute("aria-valuetext", "201 by 201 pixels, at 50, 0");
  // Drag the bottom-right corner up and left: still a square, top-left corner unchanged.
  // (On the landing page the tool sits below the hero; centre the box so its corner handles are on screen.)
  await box.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const bb = (await box.boundingBox())!;
  await page.mouse.move(bb.x + bb.width, bb.y + bb.height);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height * 0.9, { steps: 6 });
  await page.mouse.up();
  const text = (await box.getAttribute("aria-valuetext"))!;
  const [, w, h, x, y] = text.match(/(\d+) by (\d+) pixels, at (\d+), (\d+)/)!.map(Number);
  expect(w).toBe(h);
  expect(w).toBeLessThan(201);
  expect([x, y]).toEqual([50, 0]);
});
