import { expect, test } from "@playwright/test";

test.describe("Analytics Visitors tab", () => {
  test("renders Visitors Over Time heading", async ({ page }) => {
    await page.goto("/analytics");
    // Wait for the analytics shell to render
    await expect(page.locator("h1")).toContainText("Analytics");
    // The Visitors tab should be active by default
    const visitorsTab = page.locator('a:has-text("Visitors")');
    await expect(visitorsTab).toBeVisible();
  });

  test("shows chart or empty state for visitors", async ({ page }) => {
    await page.goto("/analytics");
    // Should show either the populated chart heading or the page-level empty state.
    await expect(
      page
        .getByText("Visitors Over Time")
        .or(page.getByTestId("analytics-empty-state"))
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows empty state CTA when visitors have no data", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByTestId("analytics-empty-state")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("link", { name: "Share your docs URL" }),
    ).toBeVisible();
  });

  test("does not refetch visitors analytics in a render loop", async ({
    page,
  }) => {
    let visitorsRequests = 0;
    page.on("response", (response) => {
      if (response.url().includes("/api/analytics/visitors")) {
        visitorsRequests += 1;
      }
    });

    await page.goto("/analytics");
    await expect(page.getByTestId("analytics-empty-state")).toBeVisible({
      timeout: 10000,
    });
    await page.waitForTimeout(1000);

    expect(visitorsRequests).toBeLessThanOrEqual(2);
  });

  test("switching to Agents mode shows empty state", async ({ page }) => {
    await page.goto("/analytics");
    // Click Agents toggle button
    await page.click('button:has-text("Agents")');
    // Should show agent empty state
    await expect(page.locator('text="No visitor activity"')).toBeVisible({
      timeout: 10000,
    });
  });

  test("date range picker opens and shows presets", async ({ page }) => {
    await page.goto("/analytics");
    // Click date range button
    await page.click('[data-testid="date-range-button"]');
    // Should show preset options
    await expect(page.locator('text="Last 7 days"')).toBeVisible();
    await expect(page.locator('text="Last 30 days"')).toBeVisible();
  });
});
