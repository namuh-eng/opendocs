import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

describe("project routes expose githubSource", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("GET /api/projects includes resolved githubSource for each project", async () => {
    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ orgId: "org-1", orgSlug: "acme" }]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          {
            id: "project-1",
            name: "Docs",
            slug: "docs",
            repoUrl: "https://github.com/acme/docs",
            repoBranch: "main",
            repoPath: "/guides",
            customDomain: null,
            subdomain: "acme-docs",
            settings: {
              githubSource: {
                repoFullName: "acme/docs-private",
                owner: "acme",
                repo: "docs-private",
                installationId: "inst_123",
                branch: "develop",
                path: "/internal",
                sourceType: "connected_repo",
              },
            },
            status: "active",
            createdAt: new Date("2026-04-25T00:00:00.000Z"),
            updatedAt: new Date("2026-04-25T00:00:00.000Z"),
          },
        ]),
      });

    const { GET } = await import("@/app/api/projects/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].githubSource).toEqual({
      repoFullName: "acme/docs-private",
      owner: "acme",
      repo: "docs-private",
      installationId: "inst_123",
      branch: "main",
      path: "/guides",
      sourceType: "connected_repo",
    });
  });

  it("GET /api/projects/[id] includes resolved githubSource", async () => {
    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "project-1",
            orgId: "org-1",
            name: "Docs",
            slug: "docs",
            repoUrl: "https://github.com/acme/docs",
            repoBranch: "main",
            repoPath: "/guides",
            settings: {
              githubSource: {
                repoFullName: "acme/docs-private",
                owner: "acme",
                repo: "docs-private",
                installationId: "inst_123",
                branch: "develop",
                path: "/internal",
                sourceType: "connected_repo",
              },
            },
            status: "active",
            createdAt: new Date("2026-04-25T00:00:00.000Z"),
            updatedAt: new Date("2026-04-25T00:00:00.000Z"),
          },
        ]),
      });

    const { GET } = await import("@/app/api/projects/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/projects/project-1"),
      {
        params: Promise.resolve({ id: "project-1" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.project.githubSource).toEqual({
      repoFullName: "acme/docs-private",
      owner: "acme",
      repo: "docs-private",
      installationId: "inst_123",
      branch: "main",
      path: "/guides",
      sourceType: "connected_repo",
    });
  });
});
