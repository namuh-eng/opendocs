export const DEFAULT_ASSISTANT_BEDROCK_MODEL_ID =
  "us.anthropic.claude-sonnet-4-20250514-v1:0";

export function getAssistantBedrockModelId() {
  return (
    process.env.ASSISTANT_BEDROCK_MODEL_ID?.trim() ||
    DEFAULT_ASSISTANT_BEDROCK_MODEL_ID
  );
}
