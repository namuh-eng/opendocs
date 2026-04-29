import { expect, test } from "@playwright/test";

test.describe("Settings layout shell", () => {
  test("settings index redirects to project/general", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL("**/settings/project/general");
    expect(page.url()).toContain("/settings/project/general");
  });

  test("settings sidebar is visible with all groups", async ({ page }) => {
    await page.goto("/settings/project/general");
    const sidebar = page.getByTestId("settings-sidebar");
    await expect(sidebar).toBeVisible();

    // Check group headings
    await expect(sidebar.getByText("Project Settings")).toBeVisible();
    await expect(sidebar.getByText("Deployment")).toBeVisible();
    await expect(sidebar.getByText("Security & Access")).toBeVisible();
    await expect(sidebar.getByText("Workspace")).toBeVisible();
    await expect(sidebar.getByText("Advanced")).toBeVisible();
  });

  test("active nav item is highlighted", async ({ page }) => {
    await page.goto("/settings/project/general");
    const generalLink = page.getByTestId("settings-nav-general");
    await expect(generalLink).toHaveAttribute("data-active", "true");
  });

  test("clicking a nav item navigates to that page", async ({ page }) => {
    await page.goto("/settings/project/general");
    await page.getByTestId("settings-nav-domain").click();
    await page.waitForURL("**/settings/project/domain");
    expect(page.url()).toContain("/settings/project/domain");
    await expect(page.getByText("Domain Setup")).toBeVisible();
  });

  test("exports page renders the project JSON download action", async ({
    page,
  }) => {
    await page.goto("/settings/advanced/exports");
    await expect(page.getByRole("heading", { name: "Exports" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download JSON" }),
    ).toBeVisible();
  });

  test("all nav items lead to valid pages", async ({ page }) => {
    const navItems = [
      { testId: "settings-nav-domain", urlPart: "/settings/project/domain" },
      { testId: "settings-nav-general", urlPart: "/settings/project/general" },
      { testId: "settings-nav-git", urlPart: "/settings/deployment/git" },
      {
        testId: "settings-nav-api-keys",
        urlPart: "/settings/security/api-keys",
      },
      {
        testId: "settings-nav-members",
        urlPart: "/settings/workspace/members",
      },
      {
        testId: "settings-nav-exports",
        urlPart: "/settings/advanced/exports",
      },
    ];

    await page.goto("/settings/project/general");

    for (const item of navItems) {
      await page.getByTestId(item.testId).click();
      await page.waitForURL(`**${item.urlPart}`);
      expect(page.url()).toContain(item.urlPart);
    }
  });
});
