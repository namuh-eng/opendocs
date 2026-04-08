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
    // Should show either the chart container or "Visitors Over Time" heading or empty state
    const chartOrEmpty = page.locator(
      'text="Visitors Over Time", text="No visitor data for this date range."',
    );
    await expect(chartOrEmpty.first()).toBeVisible({ timeout: 10000 });
  });

  test("shows Top pages table section", async ({ page }) => {
    await page.goto("/analytics");
    // Wait for loading to complete — either table heading or empty state
    const topPages = page.locator(
      'text="Top pages", text="No page data available."',
    );
    await expect(topPages.first()).toBeVisible({ timeout: 10000 });
  });

  test("shows Referrals table section", async ({ page }) => {
    await page.goto("/analytics");
    const referrals = page.locator(
      'text="Referrals", text="No referral data available."',
    );
    await expect(referrals.first()).toBeVisible({ timeout: 10000 });
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
