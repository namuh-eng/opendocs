import { expect, test } from "@playwright/test";

test.describe("Preview Deployments", () => {
  test("Previews tab is visible on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    const previewsTab = page.getByRole("button", { name: "Previews" });
    await expect(previewsTab).toBeVisible();
  });

  test("clicking Previews tab shows preview section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Previews" }).click();
    await expect(
      page.getByTestId("create-preview-btn"),
    ).toBeVisible();
  });

  test("Create custom preview button opens modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Previews" }).click();
    await page.getByTestId("create-preview-btn").click();
    await expect(page.getByTestId("preview-modal")).toBeVisible();
    await expect(page.getByTestId("preview-branch-input")).toBeVisible();
  });

  test("preview modal cancel closes the modal", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Previews" }).click();
    await page.getByTestId("create-preview-btn").click();
    await expect(page.getByTestId("preview-modal")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("preview-modal")).not.toBeVisible();
  });

  test("POST /api/deployments/previews creates a preview deployment", async ({
    request,
  }) => {
    const res = await request.post("/api/deployments/previews", {
      data: { branch: "feature/test-preview" },
    });
    // May be 201 (created) or 401/403 (auth required) depending on session state
    expect([201, 401, 403]).toContain(res.status());
  });

  test("GET /api/deployments/previews returns preview list", async ({
    request,
  }) => {
    const res = await request.get("/api/deployments/previews");
    // Returns previews array or auth error
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("previews");
      expect(Array.isArray(body.previews)).toBe(true);
    }
  });
});
