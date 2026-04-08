import { getTemplateById, workflowTemplates } from "@/lib/workflow-templates";
import { describe, expect, it } from "vitest";

describe("workflowTemplates", () => {
  it("has exactly 9 templates", () => {
    expect(workflowTemplates).toHaveLength(9);
  });

  it("each template has required fields", () => {
    for (const t of workflowTemplates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.defaultTrigger).toBeTruthy();
      // custom workflow has empty prompt, so don't check defaultPrompt
    }
  });

  it("all template ids are unique", () => {
    const ids = workflowTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the expected template names", () => {
    const names = workflowTemplates.map((t) => t.name);
    expect(names).toContain("Changelog");
    expect(names).toContain("API docs sync");
    expect(names).toContain("Draft feature docs");
    expect(names).toContain("Translations");
    expect(names).toContain("Enforce style guide");
    expect(names).toContain("Typo check");
    expect(names).toContain("Broken link detection");
    expect(names).toContain("SEO & metadata audit");
    expect(names).toContain("Custom workflow");
  });

  it("custom workflow has empty default prompt", () => {
    const custom = workflowTemplates.find((t) => t.id === "custom");
    expect(custom).toBeDefined();
    expect(custom?.defaultPrompt).toBe("");
  });

  it("non-custom templates have non-empty default prompts", () => {
    const nonCustom = workflowTemplates.filter((t) => t.id !== "custom");
    for (const t of nonCustom) {
      expect(t.defaultPrompt.length).toBeGreaterThan(0);
    }
  });

  it("all triggers are valid values", () => {
    const validTriggers = [
      "on_commit",
      "on_merge",
      "on_file_change",
      "on_schedule",
    ];
    for (const t of workflowTemplates) {
      expect(validTriggers).toContain(t.defaultTrigger);
    }
  });
});

describe("getTemplateById", () => {
  it("returns the correct template for a valid id", () => {
    const t = getTemplateById("changelog");
    expect(t).toBeDefined();
    expect(t?.name).toBe("Changelog");
  });

  it("returns undefined for an invalid id", () => {
    expect(getTemplateById("nonexistent")).toBeUndefined();
  });

  it("returns custom template", () => {
    const t = getTemplateById("custom");
    expect(t).toBeDefined();
    expect(t?.name).toBe("Custom workflow");
  });
});
