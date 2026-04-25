import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNextRequest(url: string, init: RequestInit = {}): NextRequest {
  const request = new Request(url, init) as NextRequest;
  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
    configurable: true,
  });
  return request;
}

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();
const insertMock = vi.fn();
const resolveGitHubImportAccessForProjectMock = vi.fn();
const getGitHubImportAccessMessageMock = vi.fn();
const importPublicGitHubDocsMock = vi.fn();
const importGitHubDocsMock = vi.fn();
const buildGitHubInstallationAuthHeadersMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/github-import", () => ({
  resolveGitHubImportAccessForProject: resolveGitHubImportAccessForProjectMock,
  getGitHubImportAccessMessage: getGitHubImportAccessMessageMock,
}));

vi.mock("@/lib/github-docs-import", () => ({
  importPublicGitHubDocs: importPublicGitHubDocsMock,
  importGitHubDocs: importGitHubDocsMock,
}));

vi.mock("@/lib/github-installation-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/github-installation-auth")>(
    "@/lib/github-installation-auth",
  );
  return {
    ...actual,
    buildGitHubInstallationAuthHeaders: buildGitHubInstallationAuthHeadersMock,
  };
});

describe("POST /api/onboarding/provision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    resolveGitHubImportAccessForProjectMock.mockResolvedValue({ status: "no_repo" });
    getGitHubImportAccessMessageMock.mockReturnValue(null);
    importPublicGitHubDocsMock.mockResolvedValue({
      ok: false,
      status: "no_markdown_found",
      message: "No markdown files were found in the selected GitHub repository path",
    });
    importGitHubDocsMock.mockResolvedValue({
      ok: false,
      status: "fetch_failed",
      message: "GitHub tree request failed with status 404",
    });
    buildGitHubInstallationAuthHeadersMock.mockResolvedValue({
      Authorization: "Bearer secret-token",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/onboarding/provision", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("provisions starter pages for a new project without a repo-backed import requirement", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "proj-1",
          repoUrl: null,
          repoBranch: "main",
          repoPath: "/",
          settings: {},
        },
      ]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/onboarding/provision", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provisioning: {
        mode: "starter_docs",
        source: "blank",
      },
    });
  });

  it("falls back to starter docs when public import finds no markdown", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "proj-1",
          repoUrl: "https://github.com/acme/docs",
          repoBranch: "main",
          repoPath: "/",
          settings: {},
        },
      ]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    resolveGitHubImportAccessForProjectMock.mockResolvedValue({ status: "public" });
    getGitHubImportAccessMessageMock.mockReturnValue(null);

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/onboarding/provision", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provisioning: {
        mode: "starter_docs",
        source: "public",
      },
    });
  });

  it("imports public github docs during onboarding when markdown is available", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "proj-1",
          repoUrl: "https://github.com/acme/docs",
          repoBranch: "main",
          repoPath: "/",
          settings: {},
        },
      ]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    resolveGitHubImportAccessForProjectMock.mockResolvedValue({ status: "public" });
    getGitHubImportAccessMessageMock.mockReturnValue(null);
    importPublicGitHubDocsMock.mockResolvedValue({
      ok: true,
      status: "imported",
      pages: [
        {
          path: "introduction",
          title: "Introduction",
          content: "# Introduction\n\nImported",
        },
      ],
      source: { owner: "acme", repo: "docs", branch: "main", path: "/" },
    });

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/onboarding/provision", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provisioning: {
        mode: "github_import",
        source: "public",
        importedPageCount: 1,
      },
    });
  });

  it("returns github_import_unavailable when private import auth is not configured", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "proj-1",
          repoUrl: "https://github.com/acme/private-docs",
          repoBranch: "main",
          repoPath: "/",
          settings: { githubSource: { installationId: "inst_123" } },
        },
      ]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    resolveGitHubImportAccessForProjectMock.mockResolvedValue({
      status: "private_connected",
    });
    getGitHubImportAccessMessageMock.mockReturnValue(null);

    const { GitHubInstallationAuthNotConfiguredError } = await import(
      "@/lib/github-installation-auth"
    );
    buildGitHubInstallationAuthHeadersMock.mockRejectedValue(
      new GitHubInstallationAuthNotConfiguredError(),
    );

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/onboarding/provision", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provisioning: {
        mode: "github_import_unavailable",
        source: "private_connected",
      },
    });
  });

  it("returns 409 if github auth is required for repo-backed import", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "proj-1",
          repoUrl: "https://github.com/acme/private-docs",
          repoBranch: "main",
          repoPath: "/",
          settings: {},
        },
      ]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    resolveGitHubImportAccessForProjectMock.mockResolvedValue({
      status: "repo_not_connected",
    });
    getGitHubImportAccessMessageMock.mockReturnValue(
      "Connect GitHub and select this repository before importing docs",
    );

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/onboarding/provision", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Connect GitHub and select this repository before importing docs",
      githubImportAccess: { status: "repo_not_connected" },
    });
  });

  it("returns 409 if the project already has content", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: "proj-1", repoUrl: null, repoBranch: "main", repoPath: "/", settings: {} },
      ]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "page-1" }]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/onboarding/provision", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Project already has content",
    });
  });
});
