/**
 * Unit tests for the v1 deployment REST API utilities.
 * POST /api/v1/project/update/{projectId} — trigger deployment
 * GET /api/v1/project/update-status/{statusId} — check deployment status
 */

import {
  extractBearerToken,
  formatDeploymentStatusResponse,
  formatDeploymentTriggerResponse,
  validateProjectId,
} from "@/lib/api-v1-deployments";
import { describe, expect, it } from "vitest";

describe("extractBearerToken", () => {
  it("extracts token from a valid Authorization header", () => {
    expect(extractBearerToken("Bearer mint_abc12345")).toBe("mint_abc12345");
  });

  it("returns null for missing header", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });

  it("returns null for non-Bearer auth scheme", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
    expect(extractBearerToken("Token abc123")).toBeNull();
  });

  it("returns null for Bearer without a token", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
  });

  it("handles extra whitespace", () => {
    expect(extractBearerToken("Bearer   mint_abc")).toBe("mint_abc");
  });
});

describe("validateProjectId", () => {
  it("accepts a valid UUID", () => {
    expect(validateProjectId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("rejects non-UUID strings", () => {
    expect(validateProjectId("not-a-uuid")).toBe(false);
    expect(validateProjectId("")).toBe(false);
    expect(validateProjectId("12345")).toBe(false);
  });

  it("rejects strings with SQL injection attempts", () => {
    expect(validateProjectId("'; DROP TABLE deployments; --")).toBe(false);
  });
});

describe("formatDeploymentTriggerResponse", () => {
  it("returns statusId and status for a new deployment", () => {
    const result = formatDeploymentTriggerResponse({
      id: "deploy-123",
      projectId: "proj-456",
      status: "queued",
      commitSha: null,
      commitMessage: "Manual Update",
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-04-08T10:00:00Z"),
    });

    expect(result).toEqual({
      statusId: "deploy-123",
      status: "queued",
      executionMode: "manual",
      executionHandoff: "manual_followup_required",
    });
  });
});

describe("formatDeploymentStatusResponse", () => {
  it("allows explicit execution handoff metadata to override inferred defaults", () => {
    const result = formatDeploymentStatusResponse(
      {
        id: "deploy-explicit",
        projectId: "proj-456",
        status: "queued",
        commitSha: null,
        commitMessage: "Manual Update",
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-08T10:00:00Z"),
      },
      {
        simulated: false,
        handoff: "simulated",
      },
    );

    expect(result).not.toBeNull();
    expect(result?.executionMode).toBe("manual");
    expect(result?.executionHandoff).toBe("simulated");
  });

  it("returns full deployment info for a queued deployment", () => {
    const result = formatDeploymentStatusResponse({
      id: "deploy-123",
      projectId: "proj-456",
      status: "queued",
      commitSha: null,
      commitMessage: "Manual Update",
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-04-08T10:00:00Z"),
    });

    expect(result).not.toBeNull();
    expect(result?.statusId).toBe("deploy-123");
    expect(result?.status).toBe("queued");
    expect(result?.startedAt).toBeNull();
    expect(result?.endedAt).toBeNull();
  });

  it("returns timing info for a completed deployment", () => {
    const start = new Date("2026-04-08T10:00:00Z");
    const end = new Date("2026-04-08T10:00:05Z");
    const result = formatDeploymentStatusResponse({
      id: "deploy-789",
      projectId: "proj-456",
      status: "succeeded",
      commitSha: "abc1234",
      commitMessage: "Fix docs",
      startedAt: start,
      endedAt: end,
      createdAt: new Date("2026-04-08T09:59:59Z"),
    });

    expect(result).not.toBeNull();
    expect(result?.statusId).toBe("deploy-789");
    expect(result?.status).toBe("succeeded");
    expect(result?.commitSha).toBe("abc1234");
    expect(result?.startedAt).toBe(start.toISOString());
    expect(result?.endedAt).toBe(end.toISOString());
  });

  it("returns null for a non-existent deployment", () => {
    const result = formatDeploymentStatusResponse(null);
    expect(result).toBeNull();
  });
});
