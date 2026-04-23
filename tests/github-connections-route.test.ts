import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(
  url: string,
  init?: { method?: string; body?: Record<string, unknown> },
): NextRequest {
  const request = new Request(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  }) as NextRequest;
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
const deleteMock = vi.fn();

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
    delete: deleteMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("/api/github-connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headersMock.mockResolvedValue(new Headers());
  });

  it("GET returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/github-connections/route");
    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("GET returns an empty list when the user has no organization", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { GET } = await import("@/app/api/github-connections/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      connections: [],
      requestId: expect.any(String),
    });
  });

  it("GET returns connections for the user's organization", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { orgId: "org-1", role: "admin", orgName: "Org" },
        ]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            id: "conn-1",
            orgId: "org-1",
            installationId: "123",
            repos: [],
            autoUpdateEnabled: true,
          },
        ]),
      });

    const { GET } = await import("@/app/api/github-connections/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      connections: [
        {
          id: "conn-1",
          orgId: "org-1",
          installationId: "123",
          repos: [],
          autoUpdateEnabled: true,
        },
      ],
      requestId: expect.any(String),
    });
  });

  it("POST returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/github-connections/route");
    const response = await POST(
      makeRequest("http://localhost:3000/api/github-connections", {
        method: "POST",
        body: { installationId: "123" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("POST returns 403 when the user has no organization", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { POST } = await import("@/app/api/github-connections/route");
    const response = await POST(
      makeRequest("http://localhost:3000/api/github-connections", {
        method: "POST",
        body: { installationId: "123" },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "No organization found",
    });
  });

  it("POST rejects viewers", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { orgId: "org-1", role: "viewer", orgName: "Org" },
      ]),
    });

    const { POST } = await import("@/app/api/github-connections/route");
    const response = await POST(
      makeRequest("http://localhost:3000/api/github-connections", {
        method: "POST",
        body: {
          installationId: "123",
          repos: [
            {
              fullName: "namuh-eng/namuh-mintlify",
              branch: "main",
              permissions: "admin",
            },
          ],
          autoUpdateEnabled: true,
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins and editors can manage GitHub connections",
    });
  });

  it("POST rejects invalid payloads", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { orgId: "org-1", role: "admin", orgName: "Org" },
      ]),
    });

    const { POST } = await import("@/app/api/github-connections/route");
    const response = await POST(
      makeRequest("http://localhost:3000/api/github-connections", {
        method: "POST",
        body: {},
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: expect.any(String),
    });
  });

  it("POST creates a new connection when installation id is new", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { orgId: "org-1", role: "admin", orgName: "Org" },
        ]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

    const returningMock = vi.fn().mockResolvedValue([
      {
        id: "conn-1",
        orgId: "org-1",
        installationId: "123",
        repos: [
          {
            fullName: "namuh-eng/namuh-mintlify",
            branch: "main",
            permissions: "admin",
          },
        ],
        autoUpdateEnabled: true,
      },
    ]);

    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });

    const { POST } = await import("@/app/api/github-connections/route");
    const response = await POST(
      makeRequest("http://localhost:3000/api/github-connections", {
        method: "POST",
        body: {
          installationId: "123",
          repos: [
            {
              fullName: "namuh-eng/namuh-mintlify",
              branch: "main",
              permissions: "admin",
            },
          ],
          autoUpdateEnabled: true,
        },
      }),
    );

    expect(valuesMock).toHaveBeenCalledWith({
      orgId: "org-1",
      installationId: "123",
      repos: [
        {
          fullName: "namuh-eng/namuh-mintlify",
          branch: "main",
          permissions: "admin",
        },
      ],
      autoUpdateEnabled: true,
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      connection: {
        id: "conn-1",
        orgId: "org-1",
        installationId: "123",
        repos: [
          {
            fullName: "namuh-eng/namuh-mintlify",
            branch: "main",
            permissions: "admin",
          },
        ],
        autoUpdateEnabled: true,
      },
      requestId: expect.any(String),
    });
  });

  it("POST updates an existing installation instead of duplicating it", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { orgId: "org-1", role: "admin", orgName: "Org" },
        ]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "conn-1",
            orgId: "org-1",
            installationId: "123",
            repos: [
              {
                fullName: "namuh-eng/old",
                branch: "main",
                permissions: "read",
              },
            ],
            autoUpdateEnabled: false,
          },
        ]),
      });

    const returningMock = vi.fn().mockResolvedValue([
      {
        id: "conn-1",
        orgId: "org-1",
        installationId: "123",
        repos: [
          {
            fullName: "namuh-eng/namuh-mintlify",
            branch: "main",
            permissions: "admin",
          },
        ],
        autoUpdateEnabled: true,
      },
    ]);

    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: returningMock }),
    });
    updateMock.mockReturnValue({ set: setMock });

    const { POST } = await import("@/app/api/github-connections/route");
    const response = await POST(
      makeRequest("http://localhost:3000/api/github-connections", {
        method: "POST",
        body: {
          installationId: "123",
          repos: [
            {
              fullName: "namuh-eng/namuh-mintlify",
              branch: "main",
              permissions: "admin",
            },
          ],
          autoUpdateEnabled: true,
        },
      }),
    );

    expect(setMock).toHaveBeenCalledWith({
      repos: [
        {
          fullName: "namuh-eng/namuh-mintlify",
          branch: "main",
          permissions: "admin",
        },
      ],
      autoUpdateEnabled: true,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      connection: {
        id: "conn-1",
        orgId: "org-1",
        installationId: "123",
        repos: [
          {
            fullName: "namuh-eng/namuh-mintlify",
            branch: "main",
            permissions: "admin",
          },
        ],
        autoUpdateEnabled: true,
      },
      requestId: expect.any(String),
    });
  });

  it("DELETE returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/github-connections/route");
    const response = await DELETE(
      makeRequest("http://localhost:3000/api/github-connections?id=conn-1", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("DELETE returns 403 when the user has no organization", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { DELETE } = await import("@/app/api/github-connections/route");
    const response = await DELETE(
      makeRequest("http://localhost:3000/api/github-connections?id=conn-1", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "No organization found",
    });
  });

  it("DELETE requires admin role", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { orgId: "org-1", role: "editor", orgName: "Org" },
      ]),
    });

    const { DELETE } = await import("@/app/api/github-connections/route");
    const response = await DELETE(
      makeRequest("http://localhost:3000/api/github-connections?id=conn-1", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins can remove GitHub connections",
    });
  });

  it("DELETE requires a connection id", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { orgId: "org-1", role: "admin", orgName: "Org" },
      ]),
    });

    const { DELETE } = await import("@/app/api/github-connections/route");
    const response = await DELETE(
      makeRequest("http://localhost:3000/api/github-connections", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Connection ID is required",
    });
  });

  it("DELETE removes the requested connection for admins", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { orgId: "org-1", role: "admin", orgName: "Org" },
      ]),
    });

    const whereMock = vi.fn().mockResolvedValue(undefined);
    deleteMock.mockReturnValue({ where: whereMock });

    const { DELETE } = await import("@/app/api/github-connections/route");
    const response = await DELETE(
      makeRequest("http://localhost:3000/api/github-connections?id=conn-1", {
        method: "DELETE",
      }),
    );

    expect(whereMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      requestId: expect.any(String),
    });
  });
});
