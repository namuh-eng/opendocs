import { expect, test } from "@playwright/test";

test.describe("Page management (Editor)", () => {
  test("editor page loads with Navigation and Files tabs", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Files" })).toBeVisible();
  });

  test("shows empty state when no pages exist", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByText("No pages yet.")).toBeVisible();
    await expect(page.getByText("Select a page to edit")).toBeVisible();
  });

  test("can open create page modal", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("add-page-btn").click();
    await expect(page.getByText("Create new page")).toBeVisible();
    await expect(
      page.getByPlaceholder("e.g. getting-started/quickstart"),
    ).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Quickstart")).toBeVisible();
  });

  test("can switch between Navigation and Files tabs", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByRole("button", { name: "Files" }).click();
    await expect(page.getByTestId("file-list")).toBeVisible();
    await page.getByRole("button", { name: "Navigation" }).click();
    // Navigation view should be showing again
    await expect(page.getByText("No pages yet.")).toBeVisible();
  });

  test("create page modal validates required fields", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("add-page-btn").click();
    // Create button should be disabled when fields are empty
    const createBtn = page.getByRole("button", { name: "Create page" });
    await expect(createBtn).toBeDisabled();
  });
});
