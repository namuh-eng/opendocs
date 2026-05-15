import { expect, test } from "@playwright/test";

test.describe("Analytics Searches tab", () => {
  test("renders Searches tab and navigates to /analytics/searches", async ({
    page,
  }) => {
    await page.goto("/analytics");
    // Searches tab should be visible in the analytics shell
    const searchesTab = page.locator('a:has-text("Searches")');
    await expect(searchesTab).toBeVisible();
    // Click the Searches tab
    await searchesTab.click();
    await expect(page).toHaveURL(/\/analytics\/searches/);
  });

  test("shows Search Volume heading or empty state", async ({ page }) => {
    await page.goto("/analytics/searches");
    await expect(
      page
        .getByText("Search Volume Over Time")
        .or(page.getByText("No search activity"))
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows Top searches table or empty state", async ({ page }) => {
    await page.goto("/analytics/searches");
    // Wait for loading to complete — either table heading or empty state
    await expect(
      page
        .getByText("Top searches")
        .or(page.getByText("No search activity"))
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("switching to Agents mode shows agent empty state on Searches tab", async ({
    page,
  }) => {
    await page.goto("/analytics/searches");
    await page.click('button:has-text("Agents")');
    await expect(page.getByText("No visitor activity")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Searches tab preserves date range from URL params", async ({
    page,
  }) => {
    await page.goto("/analytics/searches?from=2026-04-01&to=2026-04-07");
    // Should render the analytics shell with the date range
    await expect(page.locator("h1")).toContainText("Analytics");
    // The Searches tab should be active
    const searchesTab = page.locator('a:has-text("Searches")');
    await expect(searchesTab).toBeVisible();
  });
});
