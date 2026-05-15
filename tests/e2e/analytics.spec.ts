import { expect, test } from "@playwright/test";

test.describe("Analytics layout shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analytics");
  });

  test("renders Analytics heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Analytics" }),
    ).toBeVisible();
  });

  test("shows Humans/Agents traffic source toggle", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Humans" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agents" })).toBeVisible();
  });

  test("analytics content stays readable in light dashboard theme", async ({
    page,
  }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("opendocs-dashboard-theme", "light");
    });
    await page.reload();

    const shell = page.getByTestId("analytics-shell");
    await expect(shell).toBeVisible();
    await expect(shell).toHaveCSS("background-color", "rgb(14, 15, 24)");
    await expect(shell.getByRole("heading", { name: "Analytics" })).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
  });

  test("Humans mode is active by default with 5 sub-tabs", async ({ page }) => {
    const shell = page.getByTestId("analytics-shell");
    const humansBtn = shell.getByRole("button", { name: "Humans" });
    await expect(humansBtn).toHaveAttribute("data-active", "true");

    await expect(shell.getByRole("link", { name: /Visitors/ })).toBeVisible();
    await expect(shell.getByRole("link", { name: /Views/ })).toBeVisible();
    await expect(shell.getByRole("link", { name: /Assistant/ })).toBeVisible();
    await expect(shell.getByRole("link", { name: /Searches/ })).toBeVisible();
    await expect(shell.getByRole("link", { name: /Feedback/ })).toBeVisible();
  });

  test("switching to Agents mode shows 2 sub-tabs", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(
      page.getByRole("link", { name: /Agent Visitors/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /MCP Searches/ }),
    ).toBeVisible();
    // Human tabs should not be visible
    await expect(
      page.getByRole("link", { name: /^Feedback$/ }),
    ).not.toBeVisible();
  });

  test("date range picker button is visible and opens popover", async ({
    page,
  }) => {
    const dateBtn = page.getByTestId("date-range-button");
    await expect(dateBtn).toBeVisible();
    await dateBtn.click();
    // Should show presets
    await expect(page.getByText("Today")).toBeVisible();
    await expect(page.getByText("Last 7 days")).toBeVisible();
    await expect(page.getByText("All time")).toBeVisible();
  });

  test("selecting a date preset updates the button text", async ({ page }) => {
    const dateBtn = page.getByTestId("date-range-button");
    await dateBtn.click();
    await page.getByText("Today").click();
    // Popover should close and button text should update
    await expect(dateBtn).toContainText(
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );
  });

  test("traffic source is preserved in URL as query param", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await page.waitForURL(/trafficSource=agent/);
    expect(page.url()).toContain("trafficSource=agent");
  });
});
