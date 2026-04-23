import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockHeaders,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockOrderBy,
  mockInsert,
  mockValues,
  mockReturning,
  mockUpdate,
  mockSet,
  mockDelete,
  mockDeleteWhere,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockHeaders: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockOrderBy: vi.fn(),
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockReturning: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
  mockDelete: vi.fn(),
  mockDeleteWhere: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

describe("page routes permissions and contracts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

    mockSelect.mockReturnValue({
      from: mockFrom,
    });
    mockFrom.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
    });
    mockWhere.mockReturnValue({
      limit: mockLimit,
    });
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
    });

    mockInsert.mockReturnValue({
      values: mockValues,
    });
    mockValues.mockReturnValue({
      returning: mockReturning,
    });

    mockUpdate.mockReturnValue({
      set: mockSet,
    });
    mockSet.mockReturnValue({
      where: mockWhere,
      returning: mockReturning,
    });

    mockDelete.mockReturnValue({
      where: mockDeleteWhere,
    });
  });

  it("rejects page creation for viewers", async () => {
    mockLimit
      .mockResolvedValueOnce([{ orgId: "org-1", role: "viewer" }])
      .mockResolvedValueOnce([{ id: "project-1" }]);

    const { POST } = await import("@/app/api/projects/[id]/pages/route");
    const response = await POST(
      new Request("http://localhost:3015/api/projects/project-1/pages", {
        method: "POST",
        body: JSON.stringify({ path: "guide", title: "Guide" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins and editors can manage pages",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 409 when creating a page with a duplicate path", async () => {
    mockLimit
      .mockResolvedValueOnce([{ orgId: "org-1", role: "editor" }])
      .mockResolvedValueOnce([{ id: "project-1" }])
      .mockResolvedValueOnce([{ id: "page-existing" }]);

    const { POST } = await import("@/app/api/projects/[id]/pages/route");
    const response = await POST(
      new Request("http://localhost:3015/api/projects/project-1/pages", {
        method: "POST",
        body: JSON.stringify({ path: "guide", title: "Guide" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "A page with this path already exists in this project",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns a single page for authorized readers", async () => {
    mockLimit
      .mockResolvedValueOnce([{ orgId: "org-1", role: "viewer" }])
      .mockResolvedValueOnce([{ id: "project-1" }])
      .mockResolvedValueOnce([{ id: "page-1" }])
      .mockResolvedValueOnce([
        {
          id: "page-1",
          projectId: "project-1",
          path: "guide",
          title: "Guide",
          content: "# Hello",
        },
      ]);

    const { GET } = await import(
      "@/app/api/projects/[id]/pages/[pageId]/route"
    );
    const response = await GET(
      new Request("http://localhost:3015/api/projects/project-1/pages/page-1"),
      { params: Promise.resolve({ id: "project-1", pageId: "page-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      page: {
        id: "page-1",
        projectId: "project-1",
        path: "guide",
        title: "Guide",
        content: "# Hello",
      },
      requestId: expect.any(String),
    });
  });

  it("rejects page updates for viewers", async () => {
    mockLimit
      .mockResolvedValueOnce([{ orgId: "org-1", role: "viewer" }])
      .mockResolvedValueOnce([{ id: "project-1" }])
      .mockResolvedValueOnce([{ id: "page-1" }]);

    const { PUT } = await import(
      "@/app/api/projects/[id]/pages/[pageId]/route"
    );
    const response = await PUT(
      new Request("http://localhost:3015/api/projects/project-1/pages/page-1", {
        method: "PUT",
        body: JSON.stringify({ content: "updated" }),
      }),
      { params: Promise.resolve({ id: "project-1", pageId: "page-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins and editors can manage pages",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when updating a page to a conflicting path", async () => {
    mockLimit
      .mockResolvedValueOnce([{ orgId: "org-1", role: "editor" }])
      .mockResolvedValueOnce([{ id: "project-1" }])
      .mockResolvedValueOnce([{ id: "page-1" }])
      .mockResolvedValueOnce([{ id: "page-2" }]);

    const { PUT } = await import(
      "@/app/api/projects/[id]/pages/[pageId]/route"
    );
    const response = await PUT(
      new Request("http://localhost:3015/api/projects/project-1/pages/page-1", {
        method: "PUT",
        body: JSON.stringify({ path: "guide" }),
      }),
      { params: Promise.resolve({ id: "project-1", pageId: "page-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "A page with this path already exists",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects page deletion for viewers", async () => {
    mockLimit
      .mockResolvedValueOnce([{ orgId: "org-1", role: "viewer" }])
      .mockResolvedValueOnce([{ id: "project-1" }])
      .mockResolvedValueOnce([{ id: "page-1" }]);

    const { DELETE } = await import(
      "@/app/api/projects/[id]/pages/[pageId]/route"
    );
    const response = await DELETE(
      new Request("http://localhost:3015/api/projects/project-1/pages/page-1"),
      { params: Promise.resolve({ id: "project-1", pageId: "page-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins and editors can manage pages",
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes a page for editors", async () => {
    mockLimit
      .mockResolvedValueOnce([{ orgId: "org-1", role: "editor" }])
      .mockResolvedValueOnce([{ id: "project-1" }])
      .mockResolvedValueOnce([{ id: "page-1" }]);
    mockDeleteWhere.mockResolvedValue(undefined);

    const { DELETE } = await import(
      "@/app/api/projects/[id]/pages/[pageId]/route"
    );
    const response = await DELETE(
      new Request("http://localhost:3015/api/projects/project-1/pages/page-1"),
      { params: Promise.resolve({ id: "project-1", pageId: "page-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      requestId: expect.any(String),
    });
    expect(mockDelete).toHaveBeenCalled();
  });
});
