import {
  DEFAULT_AGENT_SETTINGS,
  formatRepoName,
  planSupportsAgent,
  validateAgentSettingsUpdate,
  validateConnectedRepos,
} from "@/lib/agent-settings";
import { describe, expect, it } from "vitest";

describe("agent-settings", () => {
  describe("planSupportsAgent", () => {
    it("returns false for free plan", () => {
      expect(planSupportsAgent("free")).toBe(false);
    });

    it("returns true for pro plan", () => {
      expect(planSupportsAgent("pro")).toBe(true);
    });

    it("returns true for enterprise plan", () => {
      expect(planSupportsAgent("enterprise")).toBe(true);
    });

    it("returns false for unknown plan", () => {
      expect(planSupportsAgent("starter")).toBe(false);
    });
  });

  describe("formatRepoName", () => {
    it("formats org/repo string", () => {
      expect(
        formatRepoName({
          org: "acme",
          repo: "docs",
          branch: "main",
          permissions: "All permissions",
        }),
      ).toBe("acme/docs");
    });

    it("handles special characters in repo name", () => {
      expect(
        formatRepoName({
          org: "my-org",
          repo: "my-repo.js",
          branch: "develop",
          permissions: "Read",
        }),
      ).toBe("my-org/my-repo.js");
    });
  });

  describe("validateConnectedRepos", () => {
    it("validates a valid repo array", () => {
      expect(
        validateConnectedRepos([
          {
            org: "acme",
            repo: "docs",
            branch: "main",
            permissions: "All permissions",
          },
        ]),
      ).toBe(true);
    });

    it("validates an empty array", () => {
      expect(validateConnectedRepos([])).toBe(true);
    });

    it("rejects non-array", () => {
      expect(validateConnectedRepos("not-array")).toBe(false);
    });

    it("rejects null", () => {
      expect(validateConnectedRepos(null)).toBe(false);
    });

    it("rejects array with missing org field", () => {
      expect(
        validateConnectedRepos([
          { repo: "docs", branch: "main", permissions: "All permissions" },
        ]),
      ).toBe(false);
    });

    it("rejects array with non-string branch", () => {
      expect(
        validateConnectedRepos([
          { org: "acme", repo: "docs", branch: 123, permissions: "Read" },
        ]),
      ).toBe(false);
    });

    it("validates multiple repos", () => {
      expect(
        validateConnectedRepos([
          {
            org: "acme",
            repo: "docs",
            branch: "main",
            permissions: "All permissions",
          },
          {
            org: "acme",
            repo: "api",
            branch: "develop",
            permissions: "Read",
          },
        ]),
      ).toBe(true);
    });
  });

  describe("validateAgentSettingsUpdate", () => {
    it("validates agentEnabled boolean", () => {
      const result = validateAgentSettingsUpdate({ agentEnabled: true });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.agentEnabled).toBe(true);
      }
    });

    it("rejects non-boolean agentEnabled", () => {
      const result = validateAgentSettingsUpdate({ agentEnabled: "yes" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("agentEnabled must be a boolean");
      }
    });

    it("validates slackConnected boolean", () => {
      const result = validateAgentSettingsUpdate({ slackConnected: true });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.slackConnected).toBe(true);
      }
    });

    it("validates slackWorkspace string", () => {
      const result = validateAgentSettingsUpdate({
        slackWorkspace: "My Workspace",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.slackWorkspace).toBe("My Workspace");
      }
    });

    it("validates slackWorkspace null", () => {
      const result = validateAgentSettingsUpdate({ slackWorkspace: null });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.slackWorkspace).toBeNull();
      }
    });

    it("rejects non-string/null slackWorkspace", () => {
      const result = validateAgentSettingsUpdate({ slackWorkspace: 42 });
      expect(result.valid).toBe(false);
    });

    it("validates githubAppInstalled boolean", () => {
      const result = validateAgentSettingsUpdate({
        githubAppInstalled: true,
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.githubAppInstalled).toBe(true);
      }
    });

    it("validates connectedRepos array", () => {
      const repos = [
        {
          org: "acme",
          repo: "docs",
          branch: "main",
          permissions: "All permissions",
        },
      ];
      const result = validateAgentSettingsUpdate({ connectedRepos: repos });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.connectedRepos).toEqual(repos);
      }
    });

    it("rejects invalid connectedRepos", () => {
      const result = validateAgentSettingsUpdate({
        connectedRepos: "bad-data",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects empty body", () => {
      const result = validateAgentSettingsUpdate({});
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("No valid fields to update");
      }
    });

    it("rejects null body", () => {
      const result = validateAgentSettingsUpdate(null);
      expect(result.valid).toBe(false);
    });

    it("validates multiple fields at once", () => {
      const result = validateAgentSettingsUpdate({
        agentEnabled: true,
        slackConnected: true,
        slackWorkspace: "Dev Team",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.agentEnabled).toBe(true);
        expect(result.data.slackConnected).toBe(true);
        expect(result.data.slackWorkspace).toBe("Dev Team");
      }
    });
  });

  describe("DEFAULT_AGENT_SETTINGS", () => {
    it("has all fields set to defaults", () => {
      expect(DEFAULT_AGENT_SETTINGS).toEqual({
        agentEnabled: false,
        slackConnected: false,
        slackWorkspace: null,
        githubAppInstalled: false,
        connectedRepos: [],
      });
    });
  });
});
