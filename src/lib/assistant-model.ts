export const DEFAULT_ASSISTANT_MODEL_ID = "gpt-4o-mini";

/**
 * Resolve the OpenAI chat model used by the docs assistant.
 * Override with the ASSISTANT_MODEL_ID environment variable.
 */
export function getAssistantModelId() {
  return process.env.ASSISTANT_MODEL_ID?.trim() || DEFAULT_ASSISTANT_MODEL_ID;
}
