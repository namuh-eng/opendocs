import { expect, test } from "@playwright/test";

test.describe("Analytics Agents Mode", () => {
  test("agents toggle switches to agent tabs", async ({ page }) => {
    await page.goto("/analytics?trafficSource=agent");
    // Should show Agent Visitors and MCP Searches tabs
    const tabs = page
      .locator("a")
      .filter({ hasText: /Agent Visitors|MCP Searches/ });
    await expect(tabs).toHaveCount(2);
  });

  test("agent visitors tab shows stat cards", async ({ page }) => {
    await page.goto("/analytics?trafficSource=agent");
    await expect(
      page.locator('[data-testid="stat-card-agent-visitors"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="stat-card-mcp-searches"]'),
    ).toBeVisible();
  });

  test("agent visitors tab shows empty state", async ({ page }) => {
    await page.goto("/analytics?trafficSource=agent");
    await expect(page.getByText("No visitor activity")).toBeVisible();
  });

  test("mcp searches page loads with empty state", async ({ page }) => {
    await page.goto("/analytics/mcp-searches?trafficSource=agent");
    await expect(page.getByText("No MCP search activity")).toBeVisible();
    await expect(
      page.getByText("When AI agents search your docs via MCP"),
    ).toBeVisible();
  });

  test("mcp searches page shows stat cards", async ({ page }) => {
    await page.goto("/analytics/mcp-searches?trafficSource=agent");
    await expect(
      page.locator('[data-testid="stat-card-agent-visitors"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="stat-card-mcp-searches"]'),
    ).toBeVisible();
  });

  test("switching from humans to agents changes tabs", async ({ page }) => {
    await page.goto("/analytics");
    // Should have human tabs initially
    await expect(page.locator("a").filter({ hasText: "Views" })).toBeVisible();
    // Click Agents toggle
    await page.click("button:has-text('Agents')");
    // Should now show agent tabs
    await expect(
      page.locator("a").filter({ hasText: "Agent Visitors" }),
    ).toBeVisible();
    await expect(
      page.locator("a").filter({ hasText: "MCP Searches" }),
    ).toBeVisible();
  });
});
