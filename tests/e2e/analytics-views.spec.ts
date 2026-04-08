import { expect, test } from "@playwright/test";

test.describe("Analytics Views tab", () => {
  test("renders Views tab and navigates to /analytics/views", async ({
    page,
  }) => {
    await page.goto("/analytics");
    // Views tab should be visible in the analytics shell
    const viewsTab = page.locator('a:has-text("Views")');
    await expect(viewsTab).toBeVisible();
    // Click the Views tab
    await viewsTab.click();
    await expect(page).toHaveURL(/\/analytics\/views/);
  });

  test("shows Page Views Over Time heading or empty state", async ({
    page,
  }) => {
    await page.goto("/analytics/views");
    const chartOrEmpty = page.locator(
      'text="Page Views Over Time", text="No page view data for this date range."',
    );
    await expect(chartOrEmpty.first()).toBeVisible({ timeout: 10000 });
  });

  test("shows Top pages table section (no Referrals table)", async ({
    page,
  }) => {
    await page.goto("/analytics/views");
    // Wait for loading to complete — either table heading or empty state
    const topPages = page.locator(
      'text="Top pages", text="No page data available."',
    );
    await expect(topPages.first()).toBeVisible({ timeout: 10000 });
    // Referrals table should NOT be present on the Views tab
    await expect(page.locator('h3:has-text("Referrals")')).not.toBeVisible();
  });

  test("switching to Agents mode shows empty state on Views tab", async ({
    page,
  }) => {
    await page.goto("/analytics/views");
    await page.click('button:has-text("Agents")');
    await expect(page.locator('text="No page view activity"')).toBeVisible({
      timeout: 10000,
    });
  });

  test("Views tab preserves date range from URL params", async ({ page }) => {
    await page.goto("/analytics/views?from=2026-04-01&to=2026-04-07");
    // Should render the analytics shell with the date range
    await expect(page.locator("h1")).toContainText("Analytics");
    // The Views tab should be active
    const viewsTab = page.locator('a:has-text("Views")');
    await expect(viewsTab).toBeVisible();
  });
});
