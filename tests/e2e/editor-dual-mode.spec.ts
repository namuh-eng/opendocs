import { expect, test } from "@playwright/test";

test.describe("Dual-mode MDX Editor", () => {
  test("renders editor page with toolbar and mode toggle", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    // Toolbar should have Visual / Markdown toggle tabs
    await expect(page.getByTestId("mode-visual")).toBeVisible();
    await expect(page.getByTestId("mode-markdown")).toBeVisible();
  });

  test("defaults to visual mode", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    // Visual mode tab should be active by default
    const visualTab = page.getByTestId("mode-visual");
    await expect(visualTab).toHaveAttribute("data-active", "true");
  });

  test("switches between visual and markdown modes", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();

    // Click markdown mode
    await page.getByTestId("mode-markdown").click();
    await expect(page.getByTestId("markdown-editor")).toBeVisible();

    // Click visual mode
    await page.getByTestId("mode-visual").click();
    await expect(page.getByTestId("visual-editor")).toBeVisible();
  });

  test("markdown editor shows line numbers", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();

    // Switch to markdown mode
    await page.getByTestId("mode-markdown").click();
    await expect(page.getByTestId("line-numbers")).toBeVisible();
  });

  test("publish button shows popover with site URL", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();

    // Click publish button
    const publishBtn = page.getByTestId("publish-btn");
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();
    await expect(page.getByTestId("publish-popover")).toBeVisible();
  });

  test("toolbar has formatting buttons", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();

    // Toolbar formatting buttons visible
    await expect(page.getByTestId("toolbar-bold")).toBeVisible();
    await expect(page.getByTestId("toolbar-italic")).toBeVisible();
    await expect(page.getByTestId("toolbar-heading")).toBeVisible();
  });

  test("add-new dropdown shows component options", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();

    const addNewBtn = page.getByTestId("add-new-dropdown-btn");
    await expect(addNewBtn).toBeVisible();
    await addNewBtn.click();

    // Should show component options
    await expect(page.getByText("Tab")).toBeVisible();
  });
});
