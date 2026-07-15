import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/editor/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("edits, validates, switches template, and restores local draft", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('{"basics":{"name":"Browser User"}}');
  await expect(
    page.getByTestId("resume-preview").getByText("Browser User"),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Professional" }).check();
  await page.waitForTimeout(350);
  await page.reload();
  await expect(
    page.getByTestId("resume-preview").getByText("Browser User"),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Professional" })).toBeChecked();
});

test("retains stale preview and blocks output for invalid JSON", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('{"basics":{"name":"Valid User"}}');
  await expect(
    page.getByTestId("resume-preview").getByText("Valid User"),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("{");
  await expect(
    page.getByText("Preview shows the last valid version."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export JSON" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save as PDF" }),
  ).toBeDisabled();
});

test("imports, exports, and clears local data", async ({ page }) => {
  await page
    .getByLabel("Import JSON file")
    .setInputFiles({
      name: "resume.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"basics":{"name":"Imported User"}}'),
    });
  await expect(
    page.getByTestId("resume-preview").getByText("Imported User"),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  await expect((await downloadPromise).suggestedFilename()).toBe("resume.json");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear local data" }).click();
  await expect(
    page.getByTestId("resume-preview").getByText("Imported User"),
  ).toHaveCount(0);
});

test("uses Editor and Preview tabs on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("tab", { name: "Editor" })).toBeVisible();
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.locator(".editor-pane")).toHaveCSS("display", "none");
  await expect(page.locator(".preview-pane")).not.toHaveCSS(
    "display",
    "none",
  );
});

test("print media hides editor chrome and keeps the preview", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('{"basics":{"name":"Print User"}}');
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".editor-toolbar")).toHaveCSS("display", "none");
  await expect(page.locator(".template-selector")).toHaveCSS(
    "display",
    "none",
  );
  await expect(
    page.getByTestId("resume-preview").getByText("Print User"),
  ).toBeVisible();
});
