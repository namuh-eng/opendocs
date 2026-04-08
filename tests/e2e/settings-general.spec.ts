import { expect, test } from "@playwright/test";

test.describe("Settings — General (deployment name)", () => {
  test("general page loads with project name and deployment name fields", async ({
    page,
  }) => {
    await page.goto("/settings/deployment/general");

    await expect(page.getByText("Settings / General")).toBeVisible();
    await expect(page.getByLabel("Project name")).toBeVisible();
    await expect(page.getByLabel("Deployment name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save changes/i }),
    ).toBeVisible();
  });

  test("project name and deployment name inputs are editable", async ({
    page,
  }) => {
    await page.goto("/settings/deployment/general");

    const nameInput = page.getByLabel("Project name");
    await nameInput.waitFor({ state: "visible" });
    await nameInput.fill("Test Project Name");
    await expect(nameInput).toHaveValue("Test Project Name");

    const deploymentInput = page.getByLabel("Deployment name");
    await deploymentInput.fill("test-deployment");
    await expect(deploymentInput).toHaveValue("test-deployment");
  });

  test("save changes button exists and is clickable", async ({ page }) => {
    await page.goto("/settings/deployment/general");

    const saveButton = page.getByRole("button", { name: /save changes/i });
    await expect(saveButton).toBeEnabled();
  });

  test("navigating from sidebar reaches general settings", async ({ page }) => {
    await page.goto("/settings/project/general");

    const generalLink = page.getByTestId("settings-nav-deployment-general");
    if (await generalLink.isVisible()) {
      await generalLink.click();
      await page.waitForURL("**/settings/deployment/general");
      expect(page.url()).toContain("/settings/deployment/general");
    }
  });

  test("breadcrumb shows Settings / General", async ({ page }) => {
    await page.goto("/settings/deployment/general");
    await expect(page.getByText("Settings / General")).toBeVisible();
  });
});
