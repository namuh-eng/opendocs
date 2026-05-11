import { beforeEach, describe, expect, it, vi } from "vitest";

const getTokenMock = vi.fn();

describe("github app setup helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("hydrates selected repositories with permissions", async () => {
    getTokenMock.mockResolvedValue({ token: "installation-token" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        repositories: [
          {
            full_name: "namuh-eng/opendocs",
            default_branch: "staging",
            permissions: { admin: true, push: true, pull: true },
          },
          {
            full_name: "namuh-eng/docs-demo",
            default_branch: "main",
            permissions: { pull: true },
          },
        ],
      }),
    });

    const { hydrateGitHubInstallationRepos } = await import(
      "@/lib/github-app-setup"
    );

    await expect(
      hydrateGitHubInstallationRepos("123", {
        fetchImpl: fetchMock,
        getToken: getTokenMock,
      }),
    ).resolves.toEqual([
      {
        fullName: "namuh-eng/opendocs",
        branch: "staging",
        permissions: "admin",
      },
      {
        fullName: "namuh-eng/docs-demo",
        branch: "main",
        permissions: "read",
      },
    ]);
    expect(getTokenMock).toHaveBeenCalledWith({ installationId: "123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/installation/repositories?per_page=100&page=1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer installation-token",
        }),
      }),
    );
  });

  it("hydrates repositories across every GitHub pagination page", async () => {
    getTokenMock.mockResolvedValue({ token: "installation-token" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          link: '<https://api.github.com/installation/repositories?per_page=100&page=2>; rel="next"',
        }),
        json: async () => ({
          repositories: [
            {
              full_name: "namuh-eng/repo-1",
              default_branch: "main",
              permissions: { pull: true },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          repositories: [
            {
              full_name: "namuh-eng/repo-2",
              default_branch: "develop",
              permissions: { maintain: true, pull: true },
            },
          ],
        }),
      });

    const { hydrateGitHubInstallationRepos } = await import(
      "@/lib/github-app-setup"
    );

    await expect(
      hydrateGitHubInstallationRepos("123", {
        fetchImpl: fetchMock,
        getToken: getTokenMock,
      }),
    ).resolves.toEqual([
      {
        fullName: "namuh-eng/repo-1",
        branch: "main",
        permissions: "read",
      },
      {
        fullName: "namuh-eng/repo-2",
        branch: "develop",
        permissions: "write",
      },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/installation/repositories?per_page=100&page=1",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/installation/repositories?per_page=100&page=2",
      expect.any(Object),
    );
  });
});
