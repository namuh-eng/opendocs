import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(
  url: string,
  init?: { method?: string; body?: Record<string, unknown> },
): NextRequest {
  return new Request(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  }) as NextRequest;
}

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();
const updateMock = vi.fn();
const fetchSpecFromUrlMock = vi.fn();

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
    update: updateMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/openapi", () => ({
  fetchSpecFromUrl: fetchSpecFromUrlMock,
}));

describe("/api/projects/[id]/openapi-spec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headersMock.mockResolvedValue(new Headers());
  });

  it("GET returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await GET(makeRequest("http://localhost:3000"), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("GET returns 403 when the user has no organization", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { GET } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await GET(makeRequest("http://localhost:3000"), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "No organization" });
  });

  it("GET returns the stored spec and spec URL", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

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
            settings: {
              openApiSpec: { openapi: "3.1.0", info: { title: "API", version: "1.0.0" } },
              openApiSpecUrl: "https://example.com/openapi.json",
            },
          },
        ]),
      });

    const { GET } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await GET(makeRequest("http://localhost:3000"), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      spec: { openapi: "3.1.0", info: { title: "API", version: "1.0.0" } },
      specUrl: "https://example.com/openapi.json",
      requestId: expect.any(String),
    });
  });

  it("POST returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await POST(
      makeRequest("http://localhost:3000", {
        method: "POST",
        body: { spec: { openapi: "3.1.0", info: { title: "API", version: "1.0.0" } } },
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("POST rejects requests without a url or spec payload", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    });

    const { POST } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await POST(
      makeRequest("http://localhost:3000", {
        method: "POST",
        body: {},
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Provide either url or spec in request body",
    });
  });

  it("POST returns 400 when fetching the spec URL fails", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    fetchSpecFromUrlMock.mockResolvedValue(null);

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    });

    const { POST } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await POST(
      makeRequest("http://localhost:3000", {
        method: "POST",
        body: { url: "https://example.com/openapi.json" },
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch spec from URL",
    });
  });

  it("POST rejects fetched specs that are not valid OpenAPI or AsyncAPI", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    fetchSpecFromUrlMock.mockResolvedValue({ info: { title: "Bad" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    });

    const { POST } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await POST(
      makeRequest("http://localhost:3000", {
        method: "POST",
        body: { url: "https://example.com/openapi.json" },
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(fetchSpecFromUrlMock).toHaveBeenCalledWith("https://example.com/openapi.json");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid spec: must be OpenAPI 3.x, Swagger 2.x, or AsyncAPI",
    });
  });

  it("POST returns 404 when the project is not in the user's org", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

    const { POST } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await POST(
      makeRequest("http://localhost:3000", {
        method: "POST",
        body: {
          spec: {
            openapi: "3.1.0",
            info: { title: "Inline API", version: "1.0.0" },
          },
        },
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Project not found" });
  });

  it("POST stores a valid inline spec in project settings", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

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
            settings: {
              theme: "dark",
              openApiSpecUrl: "https://existing.example/spec.json",
            },
          },
        ]),
      });

    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    updateMock.mockReturnValue({ set: setMock });

    const spec = {
      openapi: "3.1.0",
      info: { title: "Inline API", version: "1.0.0" },
      paths: {},
    };

    const { POST } = await import("@/app/api/projects/[id]/openapi-spec/route");
    const response = await POST(
      makeRequest("http://localhost:3000", {
        method: "POST",
        body: { spec },
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(setMock).toHaveBeenCalledWith({
      settings: {
        theme: "dark",
        openApiSpec: spec,
        openApiSpecUrl: "https://existing.example/spec.json",
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      specType: "openapi",
      requestId: expect.any(String),
    });
  });
});
