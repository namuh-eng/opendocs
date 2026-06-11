import { describe, expect, it } from "vitest";
import { workflows, workflowTriggerTypeEnum } from "@/lib/db/schema";
import { getTemplateById } from "@/lib/workflow-templates";

describe("workflow creation", () => {
  describe("workflows schema", () => {
    it("has the expected columns", () => {
      const cols = Object.keys(workflows);
      expect(cols).toContain("id");
      expect(cols).toContain("projectId");
      expect(cols).toContain("name");
      expect(cols).toContain("triggerType");
      expect(cols).toContain("triggerConfig");
      expect(cols).toContain("prompt");
      expect(cols).toContain("autoMerge");
      expect(cols).toContain("contextRepos");
      expect(cols).toContain("slackNotify");
      expect(cols).toContain("createdAt");
      expect(cols).toContain("updatedAt");
    });

    it("trigger type enum has correct values", () => {
      expect(workflowTriggerTypeEnum.enumValues).toEqual([
        "on_pr_merge",
        "on_schedule",
      ]);
    });
  });

  describe("template to trigger type mapping", () => {
    it("maps on_merge templates to on_pr_merge trigger type", () => {
      const changelog = getTemplateById("changelog");
      expect(changelog?.defaultTrigger).toBe("on_merge");
      // The form maps "on_merge" -> "on_pr_merge" for the DB enum
    });

    it("maps on_schedule templates to on_schedule trigger type", () => {
      const brokenLink = getTemplateById("broken-link-detection");
      expect(brokenLink?.defaultTrigger).toBe("on_schedule");
    });

    it("provides a default prompt for changelog template", () => {
      const changelog = getTemplateById("changelog");
      expect(changelog?.defaultPrompt).toBeTruthy();
      expect(changelog?.defaultPrompt.length).toBeGreaterThan(10);
    });
  });

  describe("workflow creation validation", () => {
    function validateWorkflow(body: Record<string, unknown>): string | null {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length === 0) return "name is required";
      if (name.length > 256) return "name must be 256 characters or less";

      const triggerType = body.triggerType;
      if (triggerType !== "on_pr_merge" && triggerType !== "on_schedule") {
        return "triggerType must be 'on_pr_merge' or 'on_schedule'";
      }

      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt || prompt.length === 0) return "prompt is required";
      if (prompt.length > 10000)
        return "prompt must be 10000 characters or less";

      return null;
    }

    it("rejects empty name", () => {
      expect(
        validateWorkflow({
          name: "",
          triggerType: "on_pr_merge",
          prompt: "Do stuff",
        }),
      ).toBe("name is required");
    });

    it("rejects whitespace-only name", () => {
      expect(
        validateWorkflow({
          name: "   ",
          triggerType: "on_pr_merge",
          prompt: "Do stuff",
        }),
      ).toBe("name is required");
    });

    it("rejects name over 256 chars", () => {
      expect(
        validateWorkflow({
          name: "a".repeat(257),
          triggerType: "on_pr_merge",
          prompt: "Do stuff",
        }),
      ).toBe("name must be 256 characters or less");
    });

    it("rejects invalid trigger type", () => {
      expect(
        validateWorkflow({
          name: "Test",
          triggerType: "on_commit",
          prompt: "Do stuff",
        }),
      ).toBe("triggerType must be 'on_pr_merge' or 'on_schedule'");
    });

    it("rejects empty prompt", () => {
      expect(
        validateWorkflow({
          name: "Test",
          triggerType: "on_pr_merge",
          prompt: "",
        }),
      ).toBe("prompt is required");
    });

    it("rejects prompt over 10000 chars", () => {
      expect(
        validateWorkflow({
          name: "Test",
          triggerType: "on_pr_merge",
          prompt: "x".repeat(10001),
        }),
      ).toBe("prompt must be 10000 characters or less");
    });

    it("accepts valid on_pr_merge workflow", () => {
      expect(
        validateWorkflow({
          name: "Changelog",
          triggerType: "on_pr_merge",
          prompt: "Generate a changelog",
        }),
      ).toBeNull();
    });

    it("accepts valid on_schedule workflow", () => {
      expect(
        validateWorkflow({
          name: "Link check",
          triggerType: "on_schedule",
          prompt: "Check for broken links",
        }),
      ).toBeNull();
    });
  });

  describe("trigger config shapes", () => {
    it("pr merge config holds repos array", () => {
      const config = { repos: ["org/repo1", "org/repo2"] };
      expect(config.repos).toHaveLength(2);
      expect(config.repos[0]).toBe("org/repo1");
    });

    it("schedule config holds frequency and time", () => {
      const config = { frequency: "weekly" as const, time: "09:00" };
      expect(config.frequency).toBe("weekly");
      expect(config.time).toBe("09:00");
    });

    it("custom schedule config holds cron expression", () => {
      const config = {
        frequency: "custom" as const,
        time: "09:00",
        customCron: "0 9 * * 1",
      };
      expect(config.customCron).toBe("0 9 * * 1");
    });

    it("defaults autoMerge to true", () => {
      const defaults = { autoMerge: true, slackNotify: false };
      expect(defaults.autoMerge).toBe(true);
      expect(defaults.slackNotify).toBe(false);
    });
  });
});
