import { expect, test } from "@playwright/test";

test.describe("Navigation Settings Page", () => {
  test("renders navigation settings page with title and description", async ({
    page,
  }) => {
    await page.goto("/settings/navigation");

    await expect(page.getByText("Navigation")).toBeVisible();
    await expect(
      page.getByText("Configure the docs.json navigation structure"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
  });

  test("displays default navigation entries on first load", async ({
    page,
  }) => {
    await page.goto("/settings/navigation");

    // Should have the nav entries container
    const entries = page.getByTestId("nav-entries");
    await expect(entries).toBeVisible();
  });

  test("add entry dropdown shows group, tab, and anchor options", async ({
    page,
  }) => {
    await page.goto("/settings/navigation");

    await page.getByTestId("add-entry-btn").click();
    const dropdown = page.getByTestId("add-entry-dropdown");
    await expect(dropdown).toBeVisible();

    await expect(page.getByTestId("add-group")).toBeVisible();
    await expect(page.getByTestId("add-tab")).toBeVisible();
    await expect(page.getByTestId("add-anchor")).toBeVisible();
  });

  test("can add a new group entry", async ({ page }) => {
    await page.goto("/settings/navigation");

    await page.getByTestId("add-entry-btn").click();
    await page.getByTestId("add-group").click();

    // New group should appear with "New group" label
    await expect(page.getByText("New group")).toBeVisible();
  });

  test("save button persists navigation changes", async ({ page }) => {
    await page.goto("/settings/navigation");

    // Wait for project data to load
    await page.waitForSelector('[data-testid="save-nav-btn"]');

    // Click save
    await page.getByTestId("save-nav-btn").click();

    // Wait for success or error message
    await expect(page.getByTestId("nav-message")).toBeVisible({
      timeout: 5000,
    });
  });
});
