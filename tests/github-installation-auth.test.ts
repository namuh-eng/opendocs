import { beforeEach, describe, expect, it, vi } from "vitest";

describe("github installation auth seam", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws a specific not-configured error by default", async () => {
    // biome-ignore lint/performance/noDelete: tests must remove the env var rather than assign the string "undefined"
    delete process.env.GITHUB_APP_ID;
    // biome-ignore lint/performance/noDelete: tests must remove the env var rather than assign the string "undefined"
    delete process.env.GITHUB_APP_PRIVATE_KEY;

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

  it("requests an installation token with a GitHub App JWT", async () => {
    process.env.GITHUB_APP_ID = "12345";
    process.env.GITHUB_APP_PRIVATE_KEY = "test-private-key";

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        token: "installation-token",
        expires_at: "2026-04-26T02:00:00Z",
      }),
    }));

    const { getGitHubInstallationAccessToken } = await import(
      "@/lib/github-installation-auth"
    );

    const result = await getGitHubInstallationAccessToken(
      { installationId: "98765" },
      {
        fetchImpl: fetchMock as unknown as typeof fetch,
        nowMs: Date.UTC(2026, 3, 25, 16, 0, 0),
        buildJwt: vi.fn(() => "signed-jwt"),
      },
    );

    expect(result).toEqual({
      token: "installation-token",
      expiresAt: "2026-04-26T02:00:00Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/app/installations/98765/access_tokens",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
          Authorization: "Bearer signed-jwt",
          "X-GitHub-Api-Version": "2022-11-28",
        }),
      }),
    );
  });
});
