import { expect, test } from "@playwright/test";

test.describe("API Keys Settings Page", () => {
  test("page loads and shows admin and assistant sections", async ({
    page,
  }) => {
    await page.goto("/settings/organization/api-keys");
    await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();
    await expect(page.getByText("Admin API keys")).toBeVisible();
    await expect(page.getByText("Assistant API keys")).toBeVisible();
  });

  test("can create an admin API key", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");
    await page.getByRole("button", { name: /Create Admin API Key/i }).click();

    // Fill in the modal
    await page.getByLabel("Key name").fill("Test Admin Key");
    await page.getByRole("button", { name: /^Create$/i }).click();

    // Key should be displayed once
    await expect(page.getByText(/^mint_[a-f0-9]+$/)).toBeVisible();
    // Copy hint should be visible
    await expect(page.getByText(/copy.*key|key.*shown.*once/i)).toBeVisible();
  });

  test("can create an assistant API key", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");
    await page
      .getByRole("button", { name: /Create Assistant API Key/i })
      .click();

    await page.getByLabel("Key name").fill("Test Assistant Key");
    await page.getByRole("button", { name: /^Create$/i }).click();

    // Should show assistant prefix
    await expect(page.getByText(/^mint_dsc_[a-f0-9]+$/)).toBeVisible();
  });

  test("lists created keys with masked prefix", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");

    // Create a key first
    await page.getByRole("button", { name: /Create Admin API Key/i }).click();
    await page.getByLabel("Key name").fill("Visible Key");
    await page.getByRole("button", { name: /^Create$/i }).click();

    // Close the created key dialog
    await page.getByRole("button", { name: /Done|Close/i }).click();

    // Should see the key in the list with masked prefix
    await expect(page.getByText("Visible Key")).toBeVisible();
    await expect(page.getByText(/mint_[a-f0-9]{4}\.\.\.\./)).toBeVisible();
  });

  test("can delete an API key", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");

    // Create a key to delete
    await page.getByRole("button", { name: /Create Admin API Key/i }).click();
    await page.getByLabel("Key name").fill("Delete Me Key");
    await page.getByRole("button", { name: /^Create$/i }).click();
    await page.getByRole("button", { name: /Done|Close/i }).click();

    // Delete it
    await page
      .getByRole("button", { name: /Delete|Revoke/i })
      .first()
      .click();

    // Confirm deletion
    await page.getByRole("button", { name: /Confirm|Delete/i }).click();

    // Key should be gone
    await expect(page.getByText("Delete Me Key")).not.toBeVisible();
  });
});
