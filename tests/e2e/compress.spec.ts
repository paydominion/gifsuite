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

test("compress a video to a custom size limit", async ({ page }) => {
  await page.goto("/tools");
  await page.getByRole("link", { name: /Compress & resize/ }).click();
  await expect(page).toHaveURL("/tools/compress");

  await page.locator('input[type="file"]').setInputFiles(fixture("big.mp4"));
  await expect(page.getByText("big.mp4")).toBeVisible();

  await page.getByRole("radiogroup", { name: "Target size" }).getByRole("radio", { name: "Custom" }).click();
  await page.getByLabel("Custom size in MB").fill("0.4");
  await page.getByRole("radiogroup", { name: "Max width" }).getByRole("radio", { name: "480px" }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compress & download" }).click();
  expect((await download).suggestedFilename()).toBe("big-compressed.gif");
  await expect(page.getByRole("status")).toHaveText(/Saved big-compressed\.gif \(\d+ KB\)/);
  await expect(page.getByText(/px wide · \d+fps · \d+ colors/)).toBeVisible();
  await expect(page.getByRole("img", { name: "Compressed GIF" })).toBeVisible();
});

test("refuses a custom size that makes no sense", async ({ page }) => {
  await page.goto("/tools/compress");
  await page.getByRole("radio", { name: "Custom" }).click();
  await page.getByLabel("Custom size in MB").fill("0");
  await expect(page.getByRole("alert").filter({ hasText: "between 0.02 and 100 MB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compress & download" })).toBeDisabled();
});
