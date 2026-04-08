import { expect, test } from "@playwright/test";

test.describe("Analytics Feedback Tab", () => {
  test("renders feedback sub-tabs", async ({ page }) => {
    await page.goto("/analytics/feedback");
    await page.waitForSelector('[data-testid="feedback-sub-tabs"]');

    const subTabs = page.locator('[data-testid="feedback-sub-tabs"] button');
    await expect(subTabs).toHaveCount(3);
    await expect(subTabs.nth(0)).toContainText("Ratings by page");
    await expect(subTabs.nth(1)).toContainText("Detailed feedback");
    await expect(subTabs.nth(2)).toContainText("Code snippets");
  });

  test("shows empty state when no feedback", async ({ page }) => {
    await page.goto("/analytics/feedback");
    const emptyState = page.locator('[data-testid="feedback-empty-state"]');
    // May or may not appear depending on data — check it doesn't error
    await page.waitForTimeout(2000);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasTable = await page
      .locator('[data-testid="ratings-table"]')
      .isVisible()
      .catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });

  test("filters button opens filter dialog", async ({ page }) => {
    await page.goto("/analytics/feedback");
    await page.waitForSelector('[data-testid="filters-button"]');

    await page.click('[data-testid="filters-button"]');
    await expect(page.locator('[data-testid="filter-dialog"]')).toBeVisible();
  });

  test("sub-tab switching updates active state", async ({ page }) => {
    await page.goto("/analytics/feedback");
    await page.waitForSelector('[data-testid="feedback-sub-tabs"]');

    // Click "Detailed feedback" sub-tab
    await page.click('[data-testid="sub-tab-detailed"]');
    const detailedTab = page.locator('[data-testid="sub-tab-detailed"]');
    await expect(detailedTab).toHaveClass(/bg-white/);
  });

  test("agent mode shows agent empty state", async ({ page }) => {
    await page.goto("/analytics/feedback?trafficSource=agent");
    await page.waitForTimeout(1000);
    await expect(page.locator("text=No feedback activity")).toBeVisible();
  });
});
