import { type Page, expect, test } from "@playwright/test";

async function ensureEditorPageExists(page: Page) {
  await page.goto("/editor/main");
  await page.evaluate(async () => {
    const projectsResponse = await fetch("/api/projects");
    const projectsData = (await projectsResponse.json()) as {
      projects?: Array<{ id: string }>;
    };
    const projectId = projectsData.projects?.[0]?.id;

    if (!projectId) {
      throw new Error("No project found for editor tests");
    }

    const pagesResponse = await fetch(`/api/projects/${projectId}/pages`);
    const pagesData = (await pagesResponse.json()) as {
      pages?: Array<{ id: string }>;
    };

    if ((pagesData.pages?.length ?? 0) > 0) {
      return;
    }

    const createResponse = await fetch(`/api/projects/${projectId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: `editor-e2e-${Date.now()}`,
        title: "Editor E2E",
        content: "# Editor E2E\n\nTesting content.",
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create editor page: ${createResponse.status}`);
    }
  });
}

async function seedFirstEditorPage(page: Page, content: string) {
  await page.evaluate(async (nextContent) => {
    const projectsResponse = await fetch("/api/projects");
    const projectsData = (await projectsResponse.json()) as {
      projects?: Array<{ id: string }>;
    };
    const projectId = projectsData.projects?.[0]?.id;

    if (!projectId) {
      throw new Error("No project found for editor tests");
    }

    const pagesResponse = await fetch(`/api/projects/${projectId}/pages`);
    const pagesData = (await pagesResponse.json()) as {
      pages?: Array<{ id: string }>;
    };
    const pageId = pagesData.pages?.[0]?.id;

    if (!pageId) {
      throw new Error("No page found for editor tests");
    }

    const updateResponse = await fetch(
      `/api/projects/${projectId}/pages/${pageId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      },
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to seed editor page: ${updateResponse.status}`);
    }
  }, content);
}

test.describe("Dual-mode MDX Editor", () => {
  test.beforeEach(async ({ page }) => {
    await ensureEditorPageExists(page);
  });

  test("renders editor page with toolbar and mode toggle", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(page.getByTestId("page-title")).toBeVisible();
    // Toolbar should have Visual / Markdown toggle tabs
    await expect(page.getByTestId("mode-visual")).toBeVisible();
    await expect(page.getByTestId("mode-markdown")).toBeVisible();
  });

  test("defaults to visual mode", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(page.getByTestId("page-title")).toBeVisible();
    // Visual mode tab should be active by default
    const visualTab = page.getByTestId("mode-visual");
    await expect(visualTab).toHaveAttribute("data-active", "true");
  });

  test("switches between visual and markdown modes", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(page.getByTestId("page-title")).toBeVisible();

    // Click markdown mode
    await page.getByTestId("mode-markdown").click();
    await expect(page.getByTestId("markdown-editor")).toBeVisible();

    // Click visual mode
    await page.getByTestId("mode-visual").click();
    await expect(page.getByTestId("visual-editor")).toBeVisible();
  });

  test("markdown editor shows line numbers", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(page.getByTestId("page-title")).toBeVisible();

    // Switch to markdown mode
    await page.getByTestId("mode-markdown").click();
    await expect(page.getByTestId("line-numbers")).toBeVisible();
  });

  test("publish button shows popover with site URL", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(page.getByTestId("page-title")).toBeVisible();

    // Click publish button
    const publishBtn = page.getByTestId("publish-btn");
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();
    await expect(page.getByTestId("publish-popover")).toBeVisible();
  });

  test("toolbar has formatting buttons", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(page.getByTestId("page-title")).toBeVisible();

    // Toolbar formatting buttons visible
    await expect(page.getByTestId("toolbar-bold")).toBeVisible();
    await expect(page.getByTestId("toolbar-italic")).toBeVisible();
    await expect(page.getByTestId("toolbar-heading")).toBeVisible();
  });

  test("add-new dropdown shows component options", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(page.getByTestId("page-title")).toBeVisible();

    const addNewBtn = page.getByTestId("add-new-dropdown-btn");
    await expect(addNewBtn).toBeVisible();
    await addNewBtn.click();

    // Should show component options
    await expect(page.getByRole("button", { name: "Tab" })).toBeVisible();
  });

  test("visual toolbar inserts clean markdown placeholders", async ({
    page,
  }) => {
    await page.goto("/editor/main");
    await seedFirstEditorPage(
      page,
      "# Toolbar Probe\n\nParagraph text.\n\n## Existing Heading\n",
    );
    await page.goto("/editor/main");
    await expect(page.getByTestId("visual-editor")).toBeVisible();

    await page
      .locator('[data-testid="visual-editor"] [contenteditable="true"]')
      .click();
    await page.getByTestId("toolbar-bold").click();
    await page.getByTestId("toolbar-italic").click();
    await page.getByTestId("toolbar-heading").click();
    await page.waitForTimeout(2500);

    await page.getByTestId("mode-markdown").click();
    const value = await page.getByTestId("markdown-textarea").inputValue();

    expect(value).toContain("**Bold text**");
    expect(value).toContain("*Italic text*");
    expect(value).toMatch(/\n## Heading(?:\n|$)/);
    expect(value).not.toContain("**Bold text*Italic text*Bold text**");
    expect(value).not.toContain("## Heading*Italic text*");
  });
});
