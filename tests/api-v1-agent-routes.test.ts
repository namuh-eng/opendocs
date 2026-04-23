import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNextRequest(
  url: string,
  init: RequestInit = {},
): NextRequest {
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
const updateMock = vi.fn();
const enqueueAgentJobMock = vi.fn();

vi.mock("@/lib/api-key-auth", () => ({
  authenticateApiKey: authenticateApiKeyMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock("@/lib/async-execution", async () => {
  const actual = await vi.importActual<typeof import("@/lib/async-execution")>(
    "@/lib/async-execution",
  );

  return {
    ...actual,
    enqueueAgentJob: enqueueAgentJobMock,
  };
});

describe("POST /api/v1/agent/create-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    authenticateApiKeyMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/v1/agent/create-job/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/v1/agent/create-job", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          prompt: "Fix docs",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized — valid admin API key required",
    });
  });

  it("creates a pending job and returns manual handoff metadata", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });

    const projectLookupChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "550e8400-e29b-41d4-a716-446655440000" }]),
    };

    const insertJobReturning = vi.fn().mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        prompt: "Fix docs",
        status: "pending",
        prUrl: null,
        messages: [
          {
            role: "user",
            content: "Fix docs",
            timestamp: "2026-04-23T01:00:00.000Z",
          },
        ],
        createdAt: new Date("2026-04-23T01:00:00.000Z"),
        updatedAt: new Date("2026-04-23T01:00:00.000Z"),
      },
    ]);

    const auditInsertValues = vi.fn().mockResolvedValue(undefined);
    const jobInsertValues = vi.fn().mockReturnValue({ returning: insertJobReturning });

    insertMock
      .mockReturnValueOnce({ values: jobInsertValues })
      .mockReturnValueOnce({ values: auditInsertValues });
    selectMock.mockReturnValue(projectLookupChain);
    enqueueAgentJobMock.mockResolvedValue({
      mode: "manual",
      handoff: "manual_followup_required",
    });

    const { POST } = await import("@/app/api/v1/agent/create-job/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/v1/agent/create-job", {
        method: "POST",
        headers: {
          authorization: "Bearer test-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          prompt: "Fix docs",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440001",
      status: "pending",
      executionMode: "manual",
      executionHandoff: "manual_followup_required",
    });
    expect(enqueueAgentJobMock).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440001",
    );
    expect(auditInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        action: "api_v1_agent_job_manual_handoff_required",
        details: expect.objectContaining({
          jobId: "550e8400-e29b-41d4-a716-446655440001",
          executionMode: "manual",
        }),
      }),
    );
  });
});

describe("GET /api/v1/agent/get-job/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid job id", async () => {
    const { GET } = await import("@/app/api/v1/agent/get-job/[jobId]/route");
    const response = await GET(makeNextRequest("http://localhost"), {
      params: Promise.resolve({ jobId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid job ID format",
    });
  });

  it("returns 404 when the job does not belong to the admin org", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });

    const jobLookupChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          prompt: "Fix docs",
          status: "pending",
          prUrl: null,
          messages: [],
          createdAt: new Date("2026-04-23T01:00:00.000Z"),
          updatedAt: new Date("2026-04-23T01:00:00.000Z"),
        },
      ]),
    };

    const projectLookupChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    selectMock
      .mockReturnValueOnce(jobLookupChain)
      .mockReturnValueOnce(projectLookupChain);

    const { GET } = await import("@/app/api/v1/agent/get-job/[jobId]/route");
    const response = await GET(
      makeNextRequest("http://localhost", {
        headers: { authorization: "Bearer test-key" },
      }),
      {
        params: Promise.resolve({
          jobId: "550e8400-e29b-41d4-a716-446655440001",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Job not found" });
  });
});

describe("POST /api/v1/agent/send-message/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 for completed jobs", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });

    const jobLookupChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          prompt: "Fix docs",
          status: "succeeded",
          prUrl: "https://github.com/org/repo/pull/42",
          messages: [],
          createdAt: new Date("2026-04-23T01:00:00.000Z"),
          updatedAt: new Date("2026-04-23T01:00:00.000Z"),
        },
      ]),
    };

    const projectLookupChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    selectMock
      .mockReturnValueOnce(jobLookupChain)
      .mockReturnValueOnce(projectLookupChain);

    const { POST } = await import(
      "@/app/api/v1/agent/send-message/[jobId]/route"
    );
    const response = await POST(
      makeNextRequest("http://localhost", {
        method: "POST",
        headers: {
          authorization: "Bearer test-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({ content: "Please also update the nav" }),
      }),
      {
        params: Promise.resolve({
          jobId: "550e8400-e29b-41d4-a716-446655440001",
        }),
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Cannot send messages to a succeeded job",
    });
  });
});
