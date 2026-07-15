import { expect, test } from "@playwright/test";
import { ROUTES } from "../../src/shared/routes";

test.beforeEach(async ({ page }) => {
  await page.goto(ROUTES.EDITOR);
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
  await page.getByLabel("Import JSON file").setInputFiles({
    name: "resume.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"basics":{"name":"Imported User"}}'),
  });
  await expect(
    page.getByTestId("resume-preview").getByText("Imported User"),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("resume.json");
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
  await expect(page.locator(".preview-pane")).not.toHaveCSS("display", "none");
});

test("preview pane scrolls independently on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".cm-content").click();
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("tab", { name: "Preview" }).click();
  const pane = page.locator(".preview-pane");
  await expect(pane).toBeVisible();
  const canScroll = await pane.evaluate(
    (el) => el.scrollHeight > el.clientHeight,
  );
  expect(canScroll).toBe(true);
  await pane.evaluate((el) => {
    el.scrollTop = 200;
  });
  const scrolled = await pane.evaluate((el) => el.scrollTop);
  expect(scrolled).toBeGreaterThan(0);
});

test("loads example resume JSON", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(
    page.getByTestId("resume-preview").getByText("Alex Morgan"),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("resume-preview")
      .getByText("Senior Frontend Engineer", { exact: true }),
  ).toBeVisible();
});

test("shows placeholder when editor is empty", async ({ page }) => {
  await expect(page.getByText(/Paste your JSON Resume/i)).toBeVisible();
  await expect(page.getByText("jsonresume.org")).toBeVisible();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByText(/Paste your JSON Resume/i)).toHaveCount(0);
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
  await expect(page.locator(".template-selector")).toHaveCSS("display", "none");
  await expect(
    page.getByTestId("resume-preview").getByText("Print User"),
  ).toBeVisible();
});

test("surfaces validation errors through the toolbar badge", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("{");
  await page.keyboard.press("Delete");
  const badge = page.getByRole("button", { name: /Ver \d+ problemas/ });
  await expect(badge).toBeVisible();
  await badge.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await expect(badge).toHaveCount(0);
});

test("toolbar wraps and does not overlap the tabs on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const toolbar = page.locator(".editor-toolbar");
  const tabs = page.locator(".mobile-tabs");
  await expect(toolbar).toBeVisible();
  await expect(tabs).toBeVisible();
  const toolbarBox = await toolbar.boundingBox();
  const tabsBox = await tabs.boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  // The tabs start at or below the bottom of the (possibly wrapped) toolbar.
  expect(tabsBox!.y).toBeGreaterThanOrEqual(
    toolbarBox!.y + toolbarBox!.height - 1,
  );
});

test("A4 preview fits the viewport width on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".cm-content").click();
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("tab", { name: "Preview" }).click();
  const page4 = page.locator(".resume-page");
  await expect(page4).toBeVisible();
  const box = await page4.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
});
