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

test("convert a GIF to a low-quality MP4", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: /Upload & convert/ }).click();
  await expect(page).toHaveURL("/tools/convert");

  await page.locator('input[type="file"]').setInputFiles(fixture("odd.gif"));
  await expect(page.getByRole("img", { name: "Your file" })).toBeVisible();
  await expect(page.getByText("odd.gif")).toBeVisible();

  await page.getByRole("radiogroup", { name: "Format" }).getByRole("radio", { name: "MP4" }).click();
  await page.getByRole("radiogroup", { name: "Quality" }).getByRole("radio", { name: "Low" }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Convert & download" }).click();
  expect((await download).suggestedFilename()).toBe("odd-low.mp4");
  await expect(page.getByRole("status")).toHaveText(/Saved odd-low\.mp4 \(\d+ KB\)/);
  await expect(page.getByLabel("Converted file")).toBeVisible();
});

test("explains a file it can't convert", async ({ page }) => {
  await page.goto("/tools/convert");
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("definitely not a gif, just text"),
  });
  await page.getByRole("button", { name: "Convert & download" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "isn't a GIF, MP4, MOV or WebM" })).toBeVisible();
});

test("refuses a file over the size limit before uploading it", async ({ page }) => {
  await page.goto("/tools/convert");
  await page.locator('input[type="file"]').setInputFiles({
    name: "huge.gif",
    mimeType: "image/gif",
    buffer: Buffer.alloc(4 * 1024 * 1024),
  });
  await expect(page.getByRole("alert").filter({ hasText: "over 3 MB" })).toBeVisible();
});
