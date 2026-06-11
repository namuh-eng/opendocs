import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildDeployMessage,
  connectionStatus,
  extractBranchFromRef,
  type GitHubRepo,
  isValidBranchName,
  isValidInstallationId,
  isValidInstallPayload,
  isValidPushPayload,
  isValidRepoFullName,
  matchesPushTarget,
  validateCreateConnectionRequest,
  verifyWebhookSignature,
  type WebhookPushPayload,
} from "@/lib/github-webhook";

// ── verifyWebhookSignature ─────────────────────────────────────────────────────

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";

  function sign(payload: string): string {
    return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  }

  it("should accept a valid signature", () => {
    const payload = '{"action":"push"}';
    expect(verifyWebhookSignature(payload, sign(payload), secret)).toBe(true);
  });

  it("should reject an invalid signature", () => {
    const payload = '{"action":"push"}';
    expect(verifyWebhookSignature(payload, "sha256=invalid", secret)).toBe(
      false,
    );
  });

  it("should reject null signature", () => {
    expect(verifyWebhookSignature("body", null, secret)).toBe(false);
  });

  it("should reject empty secret", () => {
    expect(verifyWebhookSignature("body", "sha256=abc", "")).toBe(false);
  });

  it("should reject empty payload", () => {
    expect(verifyWebhookSignature("", "sha256=abc", secret)).toBe(false);
  });
});

// ── extractBranchFromRef ───────────────────────────────────────────────────────

describe("extractBranchFromRef", () => {
  it("should extract branch from refs/heads/main", () => {
    expect(extractBranchFromRef("refs/heads/main")).toBe("main");
  });

  it("should extract branch from refs/heads/feature/foo", () => {
    expect(extractBranchFromRef("refs/heads/feature/foo")).toBe("feature/foo");
  });

  it("should return null for non-branch refs", () => {
    expect(extractBranchFromRef("refs/tags/v1.0")).toBeNull();
  });

  it("should return null for invalid refs", () => {
    expect(extractBranchFromRef("not-a-ref")).toBeNull();
  });
});

// ── isValidPushPayload ─────────────────────────────────────────────────────────

describe("isValidPushPayload", () => {
  it("should accept a valid push payload", () => {
    const payload = {
      ref: "refs/heads/main",
      after: "abc123",
      repository: { full_name: "owner/repo" },
    };
    expect(isValidPushPayload(payload)).toBe(true);
  });

  it("should reject null", () => {
    expect(isValidPushPayload(null)).toBe(false);
  });

  it("should reject missing ref", () => {
    expect(
      isValidPushPayload({
        after: "abc",
        repository: { full_name: "a/b" },
      }),
    ).toBe(false);
  });

  it("should reject missing repository", () => {
    expect(isValidPushPayload({ ref: "refs/heads/main", after: "abc" })).toBe(
      false,
    );
  });
});

// ── isValidInstallPayload ──────────────────────────────────────────────────────

describe("isValidInstallPayload", () => {
  it("should accept a valid install payload", () => {
    const payload = {
      action: "created",
      installation: { id: 123, account: { login: "org" } },
    };
    expect(isValidInstallPayload(payload)).toBe(true);
  });

  it("should reject missing action", () => {
    expect(isValidInstallPayload({ installation: { id: 123 } })).toBe(false);
  });

  it("should reject non-numeric installation id", () => {
    expect(
      isValidInstallPayload({
        action: "created",
        installation: { id: "abc" },
      }),
    ).toBe(false);
  });
});

// ── isValidInstallationId ──────────────────────────────────────────────────────

describe("isValidInstallationId", () => {
  it("should accept positive integers", () => {
    expect(isValidInstallationId(123)).toBe(true);
  });

  it("should reject zero", () => {
    expect(isValidInstallationId(0)).toBe(false);
  });

  it("should reject negative", () => {
    expect(isValidInstallationId(-1)).toBe(false);
  });

  it("should reject non-integers", () => {
    expect(isValidInstallationId(1.5)).toBe(false);
  });

  it("should reject strings", () => {
    expect(isValidInstallationId("123")).toBe(false);
  });
});

// ── isValidRepoFullName ────────────────────────────────────────────────────────

describe("isValidRepoFullName", () => {
  it("should accept valid owner/repo", () => {
    expect(isValidRepoFullName("owner/repo")).toBe(true);
  });

  it("should accept names with dots and hyphens", () => {
    expect(isValidRepoFullName("my-org/my.repo-name")).toBe(true);
  });

  it("should reject missing slash", () => {
    expect(isValidRepoFullName("owner-repo")).toBe(false);
  });

  it("should reject empty string", () => {
    expect(isValidRepoFullName("")).toBe(false);
  });
});

// ── isValidBranchName ──────────────────────────────────────────────────────────

describe("isValidBranchName", () => {
  it("should accept 'main'", () => {
    expect(isValidBranchName("main")).toBe(true);
  });

  it("should accept 'feature/foo'", () => {
    expect(isValidBranchName("feature/foo")).toBe(true);
  });

  it("should reject empty string", () => {
    expect(isValidBranchName("")).toBe(false);
  });

  it("should reject names starting with dot", () => {
    expect(isValidBranchName(".hidden")).toBe(false);
  });

  it("should reject names with double dots", () => {
    expect(isValidBranchName("a..b")).toBe(false);
  });

  it("should reject names with spaces", () => {
    expect(isValidBranchName("my branch")).toBe(false);
  });
});

// ── matchesPushTarget ──────────────────────────────────────────────────────────

describe("matchesPushTarget", () => {
  const repos: GitHubRepo[] = [
    { fullName: "org/docs", branch: "main", permissions: "read" },
    { fullName: "org/api", branch: "develop", permissions: "write" },
  ];

  it("should match a repo and branch", () => {
    const match = matchesPushTarget(repos, "org/docs", "main");
    expect(match).not.toBeNull();
    expect(match?.fullName).toBe("org/docs");
  });

  it("should match case-insensitively", () => {
    expect(matchesPushTarget(repos, "Org/Docs", "Main")).not.toBeNull();
  });

  it("should return null for unknown repo", () => {
    expect(matchesPushTarget(repos, "org/unknown", "main")).toBeNull();
  });

  it("should return null for wrong branch", () => {
    expect(matchesPushTarget(repos, "org/docs", "develop")).toBeNull();
  });

  it("should return null for empty repos array", () => {
    expect(matchesPushTarget([], "org/docs", "main")).toBeNull();
  });
});

// ── connectionStatus ───────────────────────────────────────────────────────────

describe("connectionStatus", () => {
  it("should return 'active' when enabled with repos", () => {
    expect(
      connectionStatus({
        autoUpdateEnabled: true,
        repos: [{ fullName: "a/b", branch: "main", permissions: "read" }],
      }),
    ).toBe("active");
  });

  it("should return 'inactive' when disabled", () => {
    expect(
      connectionStatus({
        autoUpdateEnabled: false,
        repos: [{ fullName: "a/b", branch: "main", permissions: "read" }],
      }),
    ).toBe("inactive");
  });

  it("should return 'no_repos' when no repos connected", () => {
    expect(connectionStatus({ autoUpdateEnabled: true, repos: [] })).toBe(
      "no_repos",
    );
  });
});

// ── buildDeployMessage ─────────────────────────────────────────────────────────

describe("buildDeployMessage", () => {
  it("should build a message from push payload", () => {
    const payload: WebhookPushPayload = {
      ref: "refs/heads/main",
      after: "abc123",
      repository: { full_name: "org/docs" },
      head_commit: { message: "Update README", id: "abc123" },
    };
    const msg = buildDeployMessage(payload, "main");
    expect(msg).toBe("Auto-deploy from org/docs@main: Update README");
  });

  it("should truncate long commit messages to 100 chars", () => {
    const longMsg = "A".repeat(200);
    const payload: WebhookPushPayload = {
      ref: "refs/heads/main",
      after: "abc123",
      repository: { full_name: "org/docs" },
      head_commit: { message: longMsg, id: "abc123" },
    };
    const msg = buildDeployMessage(payload, "main");
    expect(msg).toContain("A".repeat(100));
    expect(msg).not.toContain("A".repeat(101));
  });

  it("should use fallback when no head_commit", () => {
    const payload: WebhookPushPayload = {
      ref: "refs/heads/main",
      after: "abc123",
      repository: { full_name: "org/docs" },
    };
    const msg = buildDeployMessage(payload, "main");
    expect(msg).toContain("Push event");
  });

  it("should use only the first line of multi-line commit", () => {
    const payload: WebhookPushPayload = {
      ref: "refs/heads/main",
      after: "abc123",
      repository: { full_name: "org/docs" },
      head_commit: { message: "First line\nSecond line", id: "abc123" },
    };
    const msg = buildDeployMessage(payload, "main");
    expect(msg).toContain("First line");
    expect(msg).not.toContain("Second line");
  });
});

// ── validateCreateConnectionRequest ────────────────────────────────────────────

describe("validateCreateConnectionRequest", () => {
  it("should accept a valid request with repos", () => {
    const result = validateCreateConnectionRequest({
      installationId: "12345",
      repos: [{ fullName: "org/docs", branch: "main", permissions: "read" }],
    });
    expect(result.valid).toBe(true);
    expect(result.repos).toHaveLength(1);
  });

  it("should accept a valid request without repos", () => {
    const result = validateCreateConnectionRequest({
      installationId: "12345",
    });
    expect(result.valid).toBe(true);
    expect(result.repos).toHaveLength(0);
  });

  it("should reject missing installationId", () => {
    const result = validateCreateConnectionRequest({ repos: [] });
    expect(result.valid).toBe(false);
  });

  it("should reject invalid repo name", () => {
    const result = validateCreateConnectionRequest({
      installationId: "123",
      repos: [{ fullName: "invalid", branch: "main" }],
    });
    expect(result.valid).toBe(false);
  });

  it("should reject invalid branch name", () => {
    const result = validateCreateConnectionRequest({
      installationId: "123",
      repos: [{ fullName: "org/repo", branch: "..bad" }],
    });
    expect(result.valid).toBe(false);
  });

  it("should reject null body", () => {
    const result = validateCreateConnectionRequest(null);
    expect(result.valid).toBe(false);
  });

  it("should default autoUpdateEnabled to true", () => {
    const result = validateCreateConnectionRequest({
      installationId: "123",
    });
    expect(result.valid).toBe(true);
    expect(result.autoUpdateEnabled).toBe(true);
  });

  it("should accept autoUpdateEnabled=false", () => {
    const result = validateCreateConnectionRequest({
      installationId: "123",
      autoUpdateEnabled: false,
    });
    expect(result.valid).toBe(true);
    expect(result.autoUpdateEnabled).toBe(false);
  });
});
