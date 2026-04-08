import { expect, test } from "@playwright/test";

test.describe("Git Settings page", () => {
  test("loads git settings page with correct heading", async ({ page }) => {
    await page.goto("/settings/deployment/git");
    await expect(
      page.getByRole("heading", { name: "Git Settings" }),
    ).toBeVisible();
  });

  test("shows breadcrumb navigation", async ({ page }) => {
    await page.goto("/settings/deployment/git");
    await expect(
      page.getByText("Settings / Deployment / Git Settings"),
    ).toBeVisible();
  });

  test("displays branch and path form fields", async ({ page }) => {
    await page.goto("/settings/deployment/git");
    await expect(page.getByLabel("Branch")).toBeVisible();
    await expect(page.getByLabel("Directory path")).toBeVisible();
  });

  test("shows GitHub section with clone buttons", async ({ page }) => {
    await page.goto("/settings/deployment/git");
    await expect(page.getByRole("heading", { name: "GitHub" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clone as public" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clone as private" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download as ZIP" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Install GitHub App" }),
    ).toBeVisible();
  });

  test("shows GitLab section with switch button", async ({ page }) => {
    await page.goto("/settings/deployment/git");
    await expect(page.getByRole("heading", { name: "GitLab" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Configure GitLab" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Switch to GitLab" }),
    ).toBeVisible();
  });
});
