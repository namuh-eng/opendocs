import { MAX_UPLOAD_SIZE } from "@/lib/s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockHeaders,
  mockSelect,
  mockFrom,
  mockInnerJoin,
  mockWhere,
  mockLimit,
  mockGetUploadPresignedUrl,
  mockGetDownloadPresignedUrl,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockHeaders: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockInnerJoin: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockGetUploadPresignedUrl: vi.fn(),
  mockGetDownloadPresignedUrl: vi.fn(),
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
  },
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/lib/s3", async () => {
  const actual = await vi.importActual<typeof import("@/lib/s3")>("@/lib/s3");
  return {
    ...actual,
    getUploadPresignedUrl: mockGetUploadPresignedUrl,
    getDownloadPresignedUrl: mockGetDownloadPresignedUrl,
  };
});

function createGetRequest(key?: string) {
  const url = new URL("http://localhost:3015/api/uploads/presign");
  if (key) {
    url.searchParams.set("key", key);
  }

  return { nextUrl: url } as { nextUrl: URL };
}

describe("uploads presign route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockHeaders.mockResolvedValue(new Headers());
    mockSelect.mockReturnValue({
      from: mockFrom,
    });
    mockFrom.mockReturnValue({
      innerJoin: mockInnerJoin,
    });
    mockInnerJoin.mockReturnValue({
      where: mockWhere,
    });
    mockWhere.mockReturnValue({
      limit: mockLimit,
    });
  });

  it("rejects unauthenticated upload presign requests", async () => {
    mockGetSession.mockResolvedValue(null);

    const { POST } = await import("@/app/api/uploads/presign/route");
    const response = await POST(
      new Request("http://localhost:3015/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({
          orgId: "org-1",
          projectId: "project-1",
          filename: "logo.png",
          contentType: "image/png",
          size: 128,
        }),
      }) as never,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects upload presign requests from viewers", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockLimit.mockResolvedValue([{ orgId: "org-1", role: "viewer" }]);

    const { POST } = await import("@/app/api/uploads/presign/route");
    const response = await POST(
      new Request("http://localhost:3015/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({
          orgId: "org-1",
          projectId: "project-1",
          filename: "logo.png",
          contentType: "image/png",
          size: 128,
        }),
      }) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins and editors can upload assets",
    });
  });

  it("rejects uploads over the max size before generating a presigned url", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockLimit.mockResolvedValue([{ orgId: "org-1", role: "admin" }]);

    const { POST } = await import("@/app/api/uploads/presign/route");
    const response = await POST(
      new Request("http://localhost:3015/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({
          orgId: "org-1",
          projectId: "project-1",
          filename: "large.pdf",
          contentType: "application/pdf",
          size: MAX_UPLOAD_SIZE + 1,
        }),
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(mockGetUploadPresignedUrl).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: `File exceeds maximum size of ${MAX_UPLOAD_SIZE} bytes`,
    });
  });

  it("returns a presigned upload url for authorized editors", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockLimit.mockResolvedValue([{ orgId: "org-1", role: "editor" }]);
    mockGetUploadPresignedUrl.mockResolvedValue({
      url: "https://example.com/upload",
      key: "org-1/project-1/assets/logo.png",
    });

    const { POST } = await import("@/app/api/uploads/presign/route");
    const response = await POST(
      new Request("http://localhost:3015/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({
          orgId: "org-1",
          projectId: "project-1",
          filename: "logo.png",
          contentType: "image/png",
          size: 128,
        }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(mockGetUploadPresignedUrl).toHaveBeenCalledWith({
      orgId: "org-1",
      projectId: "project-1",
      filename: "logo.png",
      contentType: "image/png",
      size: 128,
    });
    await expect(response.json()).resolves.toEqual({
      url: "https://example.com/upload",
      key: "org-1/project-1/assets/logo.png",
      maxSize: MAX_UPLOAD_SIZE,
    });
  });

  it("rejects unauthenticated download presign requests", async () => {
    mockGetSession.mockResolvedValue(null);

    const { GET } = await import("@/app/api/uploads/presign/route");
    const response = await GET(
      createGetRequest("org-1/project-1/assets/logo.png") as never,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects malformed asset keys", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const { GET } = await import("@/app/api/uploads/presign/route");
    const response = await GET(createGetRequest("not-a-valid-key") as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid asset key",
    });
  });

  it("rejects download presign requests for projects outside the user's org", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockLimit.mockResolvedValue([{ orgId: "org-2", role: "viewer" }]);

    const { GET } = await import("@/app/api/uploads/presign/route");
    const response = await GET(
      createGetRequest("org-1/project-1/assets/logo.png") as never,
    );

    expect(response.status).toBe(403);
    expect(mockGetDownloadPresignedUrl).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns a download presigned url for org members", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockLimit.mockResolvedValue([{ orgId: "org-1", role: "viewer" }]);
    mockGetDownloadPresignedUrl.mockResolvedValue(
      "https://example.com/download",
    );

    const { GET } = await import("@/app/api/uploads/presign/route");
    const response = await GET(
      createGetRequest("org-1/project-1/assets/logo.png") as never,
    );

    expect(response.status).toBe(200);
    expect(mockGetDownloadPresignedUrl).toHaveBeenCalledWith(
      "org-1/project-1/assets/logo.png",
    );
    await expect(response.json()).resolves.toEqual({
      url: "https://example.com/download",
    });
  });
});
