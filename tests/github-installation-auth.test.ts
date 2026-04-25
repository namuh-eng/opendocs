import { describe, expect, it, vi } from "vitest";

describe("github installation auth seam", () => {
  it("throws a specific not-configured error by default", async () => {
    const {
      getGitHubInstallationAccessToken,
      GitHubInstallationAuthNotConfiguredError,
    } = await import("@/lib/github-installation-auth");

    await expect(
      getGitHubInstallationAccessToken({ installationId: "inst_123" }),
    ).rejects.toBeInstanceOf(GitHubInstallationAuthNotConfiguredError);
  });

  it("builds bearer auth headers when a token provider is available", async () => {
    const { buildGitHubInstallationAuthHeaders } = await import(
      "@/lib/github-installation-auth"
    );

    await expect(
      buildGitHubInstallationAuthHeaders(
        { installationId: "inst_123" },
        {
          getToken: vi.fn(async () => ({ token: "secret-token" })),
        },
      ),
    ).resolves.toEqual({
      Authorization: "Bearer secret-token",
      "X-GitHub-Api-Version": "2022-11-28",
    });
  });
});
