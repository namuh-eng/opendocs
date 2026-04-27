import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

describe("github-import helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists connected repos with installation ids", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          installationId: "inst_123",
          repos: [
            {
              fullName: "namuh-eng/namuh-mintlify",
              branch: "main",
              permissions: "admin",
            },
          ],
        },
      ]),
    });

    const mod = await import("@/lib/github-import");
    await expect(mod.listConnectedGitHubRepos("org-1")).resolves.toEqual([
      {
        fullName: "namuh-eng/namuh-mintlify",
        branch: "main",
        permissions: "admin",
        installationId: "inst_123",
      },
    ]);
  });

  it("returns private_connected when repo is in connected repos", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          installationId: "inst_123",
          repos: [
            {
              fullName: "namuh-eng/namuh-mintlify",
              branch: "main",
              permissions: "admin",
            },
          ],
        },
      ]),
    });

    const mod = await import("@/lib/github-import");
    await expect(
      mod.resolveGitHubImportAccessForRepoUrl({
        orgId: "org-1",
        repoUrl: "https://github.com/namuh-eng/namuh-mintlify",
      }),
    ).resolves.toMatchObject({
      status: "private_connected",
      repoFullName: "namuh-eng/namuh-mintlify",
    });
  });

  it("returns repo_not_connected when repo is not in connected repos and looks private", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          installationId: "inst_123",
          repos: [
            {
              fullName: "namuh-eng/other-repo",
              branch: "main",
              permissions: "read",
            },
          ],
        },
      ]),
    });

    const mod = await import("@/lib/github-import");
    await expect(
      mod.resolveGitHubImportAccessForRepoUrl({
        orgId: "org-1",
        repoUrl: "https://github.com/namuh-eng/namuh-mintlify?private=true",
      }),
    ).resolves.toMatchObject({
      status: "repo_not_connected",
      message:
        "Connect GitHub and select this repository before importing docs",
    });
  });

  it("requires matching installation id when githubSource specifies one", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          installationId: "inst_other",
          repos: [
            {
              fullName: "namuh-eng/namuh-mintlify",
              branch: "main",
              permissions: "admin",
            },
          ],
        },
      ]),
    });

    const mod = await import("@/lib/github-import");
    await expect(
      mod.resolveGitHubImportAccess({
        orgId: "org-1",
        repoUrl: "https://github.com/namuh-eng/namuh-mintlify",
        repoBranch: "main",
        repoPath: "/",
        settings: {
          githubSource: {
            repoFullName: "namuh-eng/namuh-mintlify",
            owner: "namuh-eng",
            repo: "namuh-mintlify",
            installationId: "inst_123",
            branch: "main",
            path: "/",
            sourceType: "connected_repo",
          },
        },
      }),
    ).resolves.toMatchObject({
      status: "repo_not_connected",
    });
  });
});
