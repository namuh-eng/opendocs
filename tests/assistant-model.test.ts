import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ASSISTANT_MODEL_ID,
  getAssistantModelId,
} from "@/lib/assistant-model";

describe("assistant model id", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to gpt-4o-mini", () => {
    vi.stubEnv("ASSISTANT_MODEL_ID", "");
    expect(DEFAULT_ASSISTANT_MODEL_ID).toBe("gpt-4o-mini");
    expect(getAssistantModelId()).toBe("gpt-4o-mini");
  });

  it("allows an explicit model override", () => {
    vi.stubEnv("ASSISTANT_MODEL_ID", "gpt-4o");

    expect(getAssistantModelId()).toBe("gpt-4o");
  });

  it("ignores a whitespace-only override", () => {
    vi.stubEnv("ASSISTANT_MODEL_ID", "   ");

    expect(getAssistantModelId()).toBe(DEFAULT_ASSISTANT_MODEL_ID);
  });
});
