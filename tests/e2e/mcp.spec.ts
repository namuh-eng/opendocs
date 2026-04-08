import { expect, test } from "@playwright/test";

test.describe("MCP Server Page", () => {
  test("loads MCP page with correct heading", async ({ page }) => {
    await page.goto("/products/mcp");
    await expect(
      page.getByRole("heading", { name: "Hosted MCP server" }),
    ).toBeVisible();
  });

  test("shows Beta badge", async ({ page }) => {
    await page.goto("/products/mcp");
    await expect(page.getByText("Beta")).toBeVisible();
  });

  test("displays MCP server URL input", async ({ page }) => {
    await page.goto("/products/mcp");
    await expect(page.locator("input[readonly]")).toBeVisible();
    const value = await page.locator("input[readonly]").inputValue();
    expect(value).toContain(".mintlify.app/mcp");
  });

  test("shows Copy button", async ({ page }) => {
    await page.goto("/products/mcp");
    await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
  });

  test("displays Available tools section", async ({ page }) => {
    await page.goto("/products/mcp");
    await expect(
      page.getByRole("heading", { name: "Available tools" }),
    ).toBeVisible();
  });

  test("shows search tool card", async ({ page }) => {
    await page.goto("/products/mcp");
    await expect(page.getByText(/search_/)).toBeVisible();
  });

  test("shows get_page tool card", async ({ page }) => {
    await page.goto("/products/mcp");
    await expect(page.getByText(/get_page_/)).toBeVisible();
  });
});
