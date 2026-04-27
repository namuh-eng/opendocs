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

const authenticateApiKeyMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/api-key-auth", () => ({
  authenticateApiKey: authenticateApiKeyMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

describe("GET /api/v1/project/update-status/[statusId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    authenticateApiKeyMock.mockResolvedValue(null);

    const { GET } = await import(
      "@/app/api/v1/project/update-status/[statusId]/route"
    );
    const response = await GET(
      makeNextRequest("http://localhost/api/v1/project/update-status/deploy-1"),
      { params: Promise.resolve({ statusId: "deploy-1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized — valid admin API key required",
    });
  });

  it("returns 403 for non-admin keys", async () => {
    authenticateApiKeyMock.mockResolvedValue({
      type: "readonly",
      orgId: "org-1",
    });

    const { GET } = await import(
      "@/app/api/v1/project/update-status/[statusId]/route"
    );
    const response = await GET(
      makeNextRequest("http://localhost/api/v1/project/update-status/deploy-1"),
      { params: Promise.resolve({ statusId: "deploy-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 when the deployment does not exist", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { GET } = await import(
      "@/app/api/v1/project/update-status/[statusId]/route"
    );
    const response = await GET(
      makeNextRequest("http://localhost/api/v1/project/update-status/deploy-1"),
      { params: Promise.resolve({ statusId: "deploy-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the project belongs to another org", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });

    const deploymentLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([
          { id: "deploy-1", projectId: "proj-1", status: "queued" },
        ]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // org mismatch
    };

    selectMock
      .mockReturnValueOnce(deploymentLookup)
      .mockReturnValueOnce(projectLookup);

    const { GET } = await import(
      "@/app/api/v1/project/update-status/[statusId]/route"
    );
    const response = await GET(
      makeNextRequest("http://localhost/api/v1/project/update-status/deploy-1"),
      { params: Promise.resolve({ statusId: "deploy-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns deployment status for authorized admin", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });

    const now = new Date();
    const deploymentLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "deploy-1",
          projectId: "proj-1",
          status: "queued",
          commitSha: "abc",
          commitMessage: "feat: test",
          createdAt: now,
          startedAt: null,
          endedAt: null,
        },
      ]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    selectMock
      .mockReturnValueOnce(deploymentLookup)
      .mockReturnValueOnce(projectLookup);

    const { GET } = await import(
      "@/app/api/v1/project/update-status/[statusId]/route"
    );
    const response = await GET(
      makeNextRequest("http://localhost/api/v1/project/update-status/deploy-1"),
      { params: Promise.resolve({ statusId: "deploy-1" }) },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      statusId: "deploy-1",
      status: "queued",
      executionMode: "manual",
      executionHandoff: "manual_followup_required",
    });
  });
});
