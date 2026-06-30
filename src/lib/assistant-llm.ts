/**
 * Assistant LLM streaming — OpenAI Chat Completions.
 *
 * Uses fetch (no SDK dependency) so it runs unchanged on Node and edge
 * runtimes. Yields plain text deltas; callers own the SSE wire format.
 */

import { getAssistantModelId } from "@/lib/assistant-model";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamAssistantReplyParams {
  systemPrompt: string;
  messages: AssistantMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.3;

/**
 * Parse a single OpenAI SSE event block into the text deltas it carries.
 * Returns an empty array for keep-alives, the `[DONE]` sentinel, role-only
 * deltas, and any line that is not parseable content.
 */
export function parseOpenAiEventDeltas(rawEvent: string): string[] {
  const deltas: string[] = [];
  for (const line of rawEvent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: unknown } }>;
      };
      const text = parsed.choices?.[0]?.delta?.content;
      if (typeof text === "string" && text.length > 0) {
        deltas.push(text);
      }
    } catch {
      // Ignore malformed/partial keep-alive lines.
    }
  }
  return deltas;
}

/**
 * Stream an assistant reply from OpenAI, yielding text deltas as they arrive.
 * Throws if OPENAI_API_KEY is unset or the upstream request fails before the
 * stream opens.
 */
export async function* streamAssistantReply(
  params: StreamAssistantReplyParams,
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }

  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL
  ).replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getAssistantModelId(),
      stream: true,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: params.temperature ?? DEFAULT_TEMPERATURE,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenAI request failed (${response.status})${
        detail ? `: ${detail.slice(0, 500)}` : ""
      }`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // OpenAI separates SSE events with a blank line.
      let sepIndex = buffer.indexOf("\n\n");
      while (sepIndex !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        for (const delta of parseOpenAiEventDeltas(rawEvent)) {
          yield delta;
        }
        sepIndex = buffer.indexOf("\n\n");
      }
    }

    // Flush a trailing event with no terminating blank line.
    if (buffer.trim()) {
      for (const delta of parseOpenAiEventDeltas(buffer)) {
        yield delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
