import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(url: string): NextRequest {
  const request = new Request(url) as NextRequest;
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
const updateMock = vi.fn();
const hydrateReposMock = vi.fn();

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
    update: updateMock,
  },
}));

vi.mock("@/lib/github-app-setup", () => ({
  hydrateGitHubInstallationRepos: hydrateReposMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

function mockOrg(role = "admin") {
  selectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi
      .fn()
      .mockResolvedValue([{ orgId: "org-1", role, orgName: "Org" }]),
  });
}

function mockExistingConnection(rows: Array<Record<string, unknown>>) {
  selectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  });
}

describe("/api/github-connections/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headersMock.mockResolvedValue(new Headers());
  });

  it("redirects with an error when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/github-connections/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/github-connections/callback?installation_id=123&setup_action=install",
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      "/settings/deployment/github?github_app=error&error=unauthorized",
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects callbacks without a real numeric installation id", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const { GET } = await import("@/app/api/github-connections/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/github-connections/callback?installation_id=inst_fake&setup_action=install",
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      "error=invalid_callback",
    );
    expect(hydrateReposMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects users who cannot manage the OpenDocs organization", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    mockOrg("viewer");

    const { GET } = await import("@/app/api/github-connections/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/github-connections/callback?installation_id=123&setup_action=install",
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=forbidden");
    expect(hydrateReposMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("hydrates repositories and creates a connection for a real installation", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    const repos = [
      {
        fullName: "namuh-eng/opendocs",
        branch: "staging",
        permissions: "admin",
      },
    ];
    mockOrg("admin");
    hydrateReposMock.mockResolvedValue(repos);
    mockExistingConnection([]);
    const valuesMock = vi.fn().mockReturnThis();
    const returningMock = vi.fn().mockResolvedValue([
      {
        id: "conn-1",
        orgId: "org-1",
        installationId: "123",
        repos,
        autoUpdateEnabled: true,
      },
    ]);
    insertMock.mockReturnValue({
      values: valuesMock,
      returning: returningMock,
    });

    const { GET } = await import("@/app/api/github-connections/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/github-connections/callback?installation_id=123&setup_action=install",
      ),
    );

    expect(hydrateReposMock).toHaveBeenCalledWith("123");
    expect(valuesMock).toHaveBeenCalledWith({
      orgId: "org-1",
      installationId: "123",
      repos,
      autoUpdateEnabled: true,
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("github_app=connected");
  });

  it("updates an existing same-org connection", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    const repos = [
      { fullName: "namuh-eng/opendocs", branch: "main", permissions: "write" },
    ];
    mockOrg("editor");
    hydrateReposMock.mockResolvedValue(repos);
    mockExistingConnection([
      { id: "conn-1", orgId: "org-1", installationId: "123" },
    ]);
    const setMock = vi.fn().mockReturnThis();
    const whereMock = vi.fn().mockReturnThis();
    const returningMock = vi
      .fn()
      .mockResolvedValue([
        { id: "conn-1", orgId: "org-1", installationId: "123", repos },
      ]);
    updateMock.mockReturnValue({
      set: setMock,
      where: whereMock,
      returning: returningMock,
    });

    const { GET } = await import("@/app/api/github-connections/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/github-connections/callback?installation_id=123&setup_action=update",
      ),
    );

    expect(setMock).toHaveBeenCalledWith({ repos, autoUpdateEnabled: true });
    expect(insertMock).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("github_app=connected");
  });

  it("does not reassign an installation connected to another org", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    mockOrg("admin");
    hydrateReposMock.mockResolvedValue([]);
    mockExistingConnection([
      { id: "conn-1", orgId: "org-2", installationId: "123" },
    ]);

    const { GET } = await import("@/app/api/github-connections/callback/route");
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/github-connections/callback?installation_id=123&setup_action=install",
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain(
      "error=installation_already_connected",
    );
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
