/**
 * Unit tests for the v1 agent job REST API utilities.
 * POST /api/v1/agent/create-job — create an agent job
 * GET /api/v1/agent/get-job/{jobId} — get job status
 * POST /api/v1/agent/send-message/{jobId} — send follow-up message
 */

import { describe, expect, it } from "vitest";
import {
  formatAgentJobResponse,
  validateCreateJobInput,
  validateSendMessageInput,
  validateUuid,
} from "@/lib/api-v1-agents";

describe("validateUuid", () => {
  it("accepts a valid UUID", () => {
    expect(validateUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(validateUuid("not-a-uuid")).toBe(false);
    expect(validateUuid("")).toBe(false);
    expect(validateUuid("12345")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(validateUuid(null)).toBe(false);
    expect(validateUuid(undefined)).toBe(false);
  });

  it("rejects SQL injection attempts", () => {
    expect(validateUuid("'; DROP TABLE agent_jobs; --")).toBe(false);
  });
});

describe("validateCreateJobInput", () => {
  const validInput = {
    projectId: "550e8400-e29b-41d4-a716-446655440000",
    prompt: "Update the docs for the new API endpoint",
  };

  it("accepts valid input", () => {
    const result = validateCreateJobInput(validInput);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.projectId).toBe(validInput.projectId);
      expect(result.data.prompt).toBe(validInput.prompt);
    }
  });

  it("trims whitespace from prompt", () => {
    const result = validateCreateJobInput({
      ...validInput,
      prompt: "  Fix the typo  ",
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.prompt).toBe("Fix the typo");
    }
  });

  it("rejects null body", () => {
    const result = validateCreateJobInput(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("body is required");
    }
  });

  it("rejects missing projectId", () => {
    const result = validateCreateJobInput({ prompt: "hello" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("projectId");
    }
  });

  it("rejects invalid projectId (non-UUID)", () => {
    const result = validateCreateJobInput({
      projectId: "bad-id",
      prompt: "hello",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("valid UUID");
    }
  });

  it("rejects missing prompt", () => {
    const result = validateCreateJobInput({ projectId: validInput.projectId });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("prompt");
    }
  });

  it("rejects empty prompt", () => {
    const result = validateCreateJobInput({
      projectId: validInput.projectId,
      prompt: "   ",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("empty");
    }
  });

  it("rejects non-string prompt", () => {
    const result = validateCreateJobInput({
      projectId: validInput.projectId,
      prompt: 123,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("prompt");
    }
  });
});

describe("validateSendMessageInput", () => {
  it("accepts valid content", () => {
    const result = validateSendMessageInput({
      content: "Please also fix the header",
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.content).toBe("Please also fix the header");
    }
  });

  it("trims whitespace from content", () => {
    const result = validateSendMessageInput({ content: "  hello  " });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.content).toBe("hello");
    }
  });

  it("rejects null body", () => {
    const result = validateSendMessageInput(null);
    expect(result.valid).toBe(false);
  });

  it("rejects missing content", () => {
    const result = validateSendMessageInput({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("content");
    }
  });

  it("rejects empty content", () => {
    const result = validateSendMessageInput({ content: "   " });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("empty");
    }
  });

  it("rejects non-string content", () => {
    const result = validateSendMessageInput({ content: 42 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("content");
    }
  });
});

describe("formatAgentJobResponse", () => {
  const now = new Date("2026-04-09T12:00:00Z");

  const mockJob = {
    id: "job-uuid-1",
    projectId: "proj-uuid-1",
    prompt: "Fix the docs",
    status: "pending" as const,
    prUrl: null,
    messages: [] as {
      role: "user" | "agent";
      content: string;
      timestamp: string;
    }[],
    createdAt: now,
    updatedAt: now,
  };

  it("formats a pending job with no messages", () => {
    const result = formatAgentJobResponse(mockJob);
    expect(result).toEqual({
      id: "job-uuid-1",
      projectId: "proj-uuid-1",
      prompt: "Fix the docs",
      status: "pending",
      prUrl: null,
      messages: [],
      createdAt: "2026-04-09T12:00:00.000Z",
      updatedAt: "2026-04-09T12:00:00.000Z",
      executionMode: "manual",
      executionHandoff: "manual_followup_required",
    });
  });

  it("includes prUrl when set", () => {
    const result = formatAgentJobResponse({
      ...mockJob,
      status: "succeeded",
      prUrl: "https://github.com/org/repo/pull/42",
    });
    expect(result.prUrl).toBe("https://github.com/org/repo/pull/42");
    expect(result.status).toBe("succeeded");
  });

  it("includes messages array", () => {
    const messages = [
      {
        role: "user" as const,
        content: "Fix the docs",
        timestamp: "2026-04-09T12:00:00Z",
      },
      {
        role: "agent" as const,
        content: "Working on it",
        timestamp: "2026-04-09T12:01:00Z",
      },
    ];
    const result = formatAgentJobResponse({ ...mockJob, messages });
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[1].role).toBe("agent");
  });

  it("converts Date objects to ISO strings", () => {
    const result = formatAgentJobResponse(mockJob);
    expect(result.createdAt).toBe("2026-04-09T12:00:00.000Z");
    expect(typeof result.createdAt).toBe("string");
  });

  it("allows explicit execution handoff metadata to override inferred defaults", () => {
    const result = formatAgentJobResponse(mockJob, {
      simulated: false,
      handoff: "simulated",
    });

    expect(result.executionMode).toBe("manual");
    expect(result.executionHandoff).toBe("simulated");
  });
});
