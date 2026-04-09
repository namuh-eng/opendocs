import { expect, test } from "@playwright/test";

test.describe("Dashboard Layout", () => {
  test("dashboard page loads with sidebar and top bar", async ({ page }) => {
    await page.goto("/dashboard");
    // Should see sidebar
    await expect(page.getByTestId("sidebar")).toBeVisible();
    // Should see top bar
    await expect(page.getByTestId("top-bar")).toBeVisible();
  });

  test("sidebar shows main navigation items", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByText("Home")).toBeVisible();
    await expect(sidebar.getByText("Editor")).toBeVisible();
    await expect(sidebar.getByText("Analytics")).toBeVisible();
    await expect(sidebar.getByText("Settings")).toBeVisible();
  });

  test("sidebar shows Agents group with items", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByText("Agents")).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Agent New" }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Assistant" }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Workflows" }),
    ).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "MCP" })).toBeVisible();
  });

  test("sidebar has org switcher with org name", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.getByTestId("sidebar");
    // Org switcher button should be present (org name varies, so check for any button in the org area)
    const orgButton = sidebar.locator("button").first();
    await expect(orgButton).toBeVisible();
  });

  test("sidebar collapse button exists", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeVisible();
  });

  test("sidebar collapse persists after reload", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.getByTestId("sidebar")).toHaveAttribute(
      "data-collapsed",
      "true",
    );

    await page.reload();

    await expect(page.getByTestId("sidebar")).toHaveAttribute(
      "data-collapsed",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
  });

  test("top bar has search, notifications, chat, and profile", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Notifications" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Profile menu" }),
    ).toBeVisible();
  });

  test("profile menu opens with user options", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Profile menu" }).click();
    await expect(page.getByText("Your profile")).toBeVisible();
    await expect(page.getByText("Invite members")).toBeVisible();
    await expect(page.getByText("Log Out")).toBeVisible();
  });

  test("profile menu links to the workspace profile page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("link", { name: "Your profile" }).click();

    await page.waitForURL("**/settings/workspace/profile");
    await expect(
      page.getByRole("heading", { name: "My Profile" }),
    ).toBeVisible();
  });

  test("profile menu logout clears the session and redirects to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByText("Log Out").click();

    await page.waitForURL("**/login");
    await page.goto("/dashboard");
    await page.waitForURL("**/login?returnTo=%2Fdashboard");
  });

  test("theme switcher persists the selected shell theme", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByTestId("theme-light").click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("trial banner is visible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("trial-banner")).toBeVisible();
    await expect(page.getByText("free trial")).toBeVisible();
  });

  test("trial banner dismissal persists after reload", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Dismiss banner" }).click();
    await expect(page.getByTestId("trial-banner")).toBeHidden();

    await page.reload();

    await expect(page.getByTestId("trial-banner")).toBeHidden();
  });

  test("dashboard shows greeting", async ({ page }) => {
    await page.goto("/dashboard");
    // Should contain "Good morning/afternoon/evening"
    await expect(
      page.getByText(/Good (morning|afternoon|evening)/),
    ).toBeVisible();
  });

  test("mobile layout uses an off-canvas sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");

    await expect(page.getByTestId("sidebar")).toHaveAttribute(
      "data-mobile-open",
      "false",
    );
    await expect(page.getByTestId("sidebar-mobile-toggle")).toBeVisible();

    await page.getByTestId("sidebar-mobile-toggle").click();
    await expect(page.getByTestId("sidebar")).toHaveAttribute(
      "data-mobile-open",
      "true",
    );
    await expect(page.getByText("Home")).toBeVisible();
  });
});
