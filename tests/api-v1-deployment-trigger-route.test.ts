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
const insertMock = vi.fn();
const enqueueDeploymentMock = vi.fn();

vi.mock("@/lib/api-key-auth", () => ({
  authenticateApiKey: authenticateApiKeyMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock("@/lib/async-execution", async () => {
  const actual = await vi.importActual<typeof import("@/lib/async-execution")>(
    "@/lib/async-execution",
  );
  return {
    ...actual,
    enqueueDeployment: enqueueDeploymentMock,
  };
});

describe("POST /api/v1/project/update/[projectId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid project ID format", async () => {
    const { POST } = await import(
      "@/app/api/v1/project/update/[projectId]/route"
    );
    const response = await POST(
      makeNextRequest("http://localhost/api/v1/project/update/not-a-uuid"),
      { params: Promise.resolve({ projectId: "not-a-uuid" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid project ID format",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    authenticateApiKeyMock.mockResolvedValue(null);

    const { POST } = await import(
      "@/app/api/v1/project/update/[projectId]/route"
    );
    const response = await POST(
      makeNextRequest(
        "http://localhost/api/v1/project/update/550e8400-e29b-41d4-a716-446655440000",
      ),
      {
        params: Promise.resolve({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized — valid admin API key required",
    });
  });

  it("returns 404 when project not found in org", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { POST } = await import(
      "@/app/api/v1/project/update/[projectId]/route"
    );
    const response = await POST(
      makeNextRequest(
        "http://localhost/api/v1/project/update/550e8400-e29b-41d4-a716-446655440000",
      ),
      {
        params: Promise.resolve({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("triggers a deployment and returns manual handoff metadata", async () => {
    const projectId = "550e8400-e29b-41d4-a716-446655440000";
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });

    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: projectId, orgId: "org-1" }]),
    });

    const deploymentInsertReturning = vi
      .fn()
      .mockResolvedValue([{ id: "deploy-1", projectId, status: "queued" }]);
    const auditInsertValues = vi.fn().mockResolvedValue(undefined);

    insertMock
      .mockReturnValueOnce({
        values: vi
          .fn()
          .mockReturnValue({ returning: deploymentInsertReturning }),
      })
      .mockReturnValueOnce({ values: auditInsertValues });

    enqueueDeploymentMock.mockResolvedValue({
      mode: "manual",
      handoff: "manual_followup_required",
    });

    const { POST } = await import(
      "@/app/api/v1/project/update/[projectId]/route"
    );
    const response = await POST(
      makeNextRequest(`http://localhost/api/v1/project/update/${projectId}`),
      { params: Promise.resolve({ projectId }) },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toMatchObject({
      statusId: "deploy-1",
      status: "queued",
      executionMode: "manual",
      executionHandoff: "manual_followup_required",
    });
    expect(enqueueDeploymentMock).toHaveBeenCalledWith("deploy-1", projectId);
    expect(auditInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        action: "api_v1_deployment_manual_handoff_required",
      }),
    );
  });
});
