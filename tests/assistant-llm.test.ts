import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type AssistantMessage,
  parseOpenAiEventDeltas,
  streamAssistantReply,
} from "@/lib/assistant-llm";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

async function collect(
  gen: AsyncGenerator<string, void, unknown>,
): Promise<string[]> {
  const out: string[] = [];
  for await (const delta of gen) out.push(delta);
  return out;
}

const messages: AssistantMessage[] = [{ role: "user", content: "hi" }];

describe("parseOpenAiEventDeltas", () => {
  it("extracts content from a delta event", () => {
    expect(
      parseOpenAiEventDeltas(
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      ),
    ).toEqual(["Hello"]);
  });

  it("ignores the [DONE] sentinel", () => {
    expect(parseOpenAiEventDeltas("data: [DONE]")).toEqual([]);
  });

  it("ignores role-only deltas with no content", () => {
    expect(
      parseOpenAiEventDeltas(
        'data: {"choices":[{"delta":{"role":"assistant"}}]}',
      ),
    ).toEqual([]);
  });

  it("ignores non-data and malformed lines", () => {
    expect(parseOpenAiEventDeltas(": keep-alive")).toEqual([]);
    expect(parseOpenAiEventDeltas("data: not-json")).toEqual([]);
    expect(parseOpenAiEventDeltas("")).toEqual([]);
  });
});

describe("streamAssistantReply", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(
      collect(streamAssistantReply({ systemPrompt: "sys", messages })),
    ).rejects.toThrow("OPENAI_API_KEY");
  });

  it("streams text deltas, reassembling across chunk boundaries", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      status: 200,
      body: streamFromChunks([
        'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: {"choices":[{"delta":{"content":" wor',
        'ld"}}]}\n\n',
        "data: [DONE]\n\n",
      ]),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const deltas = await collect(
      streamAssistantReply({ systemPrompt: "sys", messages }),
    );
    expect(deltas).toEqual(["Hello", " world"]);

    // Request is shaped as a streaming OpenAI chat completion.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.stream).toBe(true);
    expect(sentBody.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(sentBody.messages[1]).toEqual({ role: "user", content: "hi" });
  });

  it("honors OPENAI_BASE_URL overrides", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OPENAI_BASE_URL", "https://gateway.example.com/v1/");
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      status: 200,
      body: streamFromChunks(["data: [DONE]\n\n"]),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await collect(streamAssistantReply({ systemPrompt: "sys", messages }));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://gateway.example.com/v1/chat/completions",
    );
  });

  it("throws with status detail when the upstream request fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        text: async () => "rate limited",
        body: null,
      })),
    );

    await expect(
      collect(streamAssistantReply({ systemPrompt: "sys", messages })),
    ).rejects.toThrow("429");
  });
});
