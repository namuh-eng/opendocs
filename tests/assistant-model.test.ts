import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ASSISTANT_BEDROCK_MODEL_ID,
  getAssistantBedrockModelId,
} from "@/lib/assistant-model";

describe("assistant Bedrock model id", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the valid Bedrock inference profile id", () => {
    expect(DEFAULT_ASSISTANT_BEDROCK_MODEL_ID).toBe(
      "us.anthropic.claude-sonnet-4-20250514-v1:0",
    );
    expect(getAssistantBedrockModelId()).toBe(
      "us.anthropic.claude-sonnet-4-20250514-v1:0",
    );
  });

  it("allows an explicit model override", () => {
    vi.stubEnv("ASSISTANT_BEDROCK_MODEL_ID", "custom-model-id");

    expect(getAssistantBedrockModelId()).toBe("custom-model-id");
  });
});
