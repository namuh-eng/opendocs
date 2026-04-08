import { expect, test } from "@playwright/test";

test.describe("Add-ons settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/project/addons");
  });

  test("renders feedback section with all 5 toggles", async ({ page }) => {
    await expect(page.getByText("Feedback")).toBeVisible();
    await expect(
      page.getByText("Enable feedback widgets on your docs"),
    ).toBeVisible();
    await expect(page.getByText("Thumbs rating")).toBeVisible();
    await expect(page.getByText("Edit suggestions")).toBeVisible();
    await expect(page.getByText("Raise issues")).toBeVisible();
    await expect(page.getByText("Contextual feedback")).toBeVisible();
    await expect(page.getByText("Code snippet feedback")).toBeVisible();
  });

  test("renders CI/CD checks section with dropdowns", async ({ page }) => {
    await expect(page.getByText("CI/CD checks")).toBeVisible();
    await expect(page.getByText("Broken links")).toBeVisible();
    await expect(page.getByText("Grammar linter")).toBeVisible();
  });

  test("renders previews section", async ({ page }) => {
    await expect(page.getByText("Previews")).toBeVisible();
    await expect(page.getByText("Preview deployments")).toBeVisible();
    await expect(page.getByText("Preview auth")).toBeVisible();
  });

  test("toggles thumbs rating and saves", async ({ page }) => {
    // Find the thumbs rating toggle and click it
    const thumbsRow = page.locator("[data-testid='toggle-thumbsRating']");
    await thumbsRow.click();
    // Click save
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("Changes saved")).toBeVisible();
  });

  test("changes broken links dropdown to enabled", async ({ page }) => {
    const brokenLinksSelect = page.locator(
      "[data-testid='select-brokenLinks']",
    );
    await brokenLinksSelect.selectOption("enabled");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("Changes saved")).toBeVisible();
  });
});
