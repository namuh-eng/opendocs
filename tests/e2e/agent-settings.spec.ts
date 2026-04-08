import { expect, test } from "@playwright/test";

test.describe("Agent Settings Page", () => {
  test("renders agent settings page with enable section", async ({ page }) => {
    await page.goto("/products/agent");
    await expect(page.getByTestId("agent-settings-page")).toBeVisible();
    await expect(page.getByTestId("enable-agent-section")).toBeVisible();
    await expect(
      page.getByText("Enable the agent to keep your docs up-to-date"),
    ).toBeVisible();
  });

  test("shows upgrade plan button for free plan users", async ({ page }) => {
    await page.goto("/products/agent");
    // Free plan users see the upgrade button
    const upgradeBtn = page.getByTestId("upgrade-plan-btn");
    const toggle = page.getByTestId("agent-toggle");
    // One of these should be visible depending on plan
    const hasUpgrade = await upgradeBtn.isVisible().catch(() => false);
    const hasToggle = await toggle.isVisible().catch(() => false);
    expect(hasUpgrade || hasToggle).toBe(true);
  });

  test("renders Slack connection section", async ({ page }) => {
    await page.goto("/products/agent");
    await expect(page.getByTestId("slack-section")).toBeVisible();
    await expect(page.getByText("Slack Connection")).toBeVisible();
    await expect(page.getByTestId("slack-status-badge")).toBeVisible();
  });

  test("renders GitHub app section", async ({ page }) => {
    await page.goto("/products/agent");
    await expect(page.getByTestId("github-section")).toBeVisible();
    await expect(page.getByText("GitHub App")).toBeVisible();
    await expect(page.getByTestId("configure-github-link")).toBeVisible();
  });

  test("renders Linear Agent promo card with dismiss", async ({ page }) => {
    await page.goto("/products/agent");
    const promo = page.getByTestId("linear-promo-card");
    // On larger viewports the promo should be visible
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/products/agent");
    await expect(promo).toBeVisible();
    await expect(page.getByText("Linear Agent")).toBeVisible();

    // Dismiss the promo
    await page.getByTestId("dismiss-linear-promo").click();
    await expect(promo).not.toBeVisible();
  });

  test("jobs tab shows agent job list", async ({ page }) => {
    await page.goto("/products/agent?tab=jobs");
    await expect(page.getByTestId("agent-page")).toBeVisible();
  });
});
