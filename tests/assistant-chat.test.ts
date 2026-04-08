import { describe, expect, it } from "vitest";

// ── SSE parsing ──────────────────────────────────────────────────────────────

/**
 * Parse an SSE data line into a typed event object.
 * Mirrors the parsing logic in the chat widget client.
 */
function parseSseEvent(line: string): {
  type: string;
  textDelta?: string;
  sources?: Array<{ id: string; url: string; title: string }>;
  threadId?: string;
  error?: string;
} | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

describe("SSE event parsing", () => {
  it("parses text-delta events", () => {
    const event = parseSseEvent(
      'data: {"type":"text-delta","textDelta":"Hello"}',
    );
    expect(event).toEqual({ type: "text-delta", textDelta: "Hello" });
  });

  it("parses sources events", () => {
    const event = parseSseEvent(
      'data: {"type":"sources","sources":[{"id":"intro","url":"/intro","title":"Introduction"}]}',
    );
    expect(event?.type).toBe("sources");
    expect(event?.sources).toHaveLength(1);
    expect(event?.sources?.[0].title).toBe("Introduction");
  });

  it("parses finish events with threadId", () => {
    const event = parseSseEvent('data: {"type":"finish","threadId":"abc-123"}');
    expect(event).toEqual({ type: "finish", threadId: "abc-123" });
  });

  it("parses error events", () => {
    const event = parseSseEvent(
      'data: {"type":"error","error":"Something went wrong"}',
    );
    expect(event).toEqual({ type: "error", error: "Something went wrong" });
  });

  it("returns null for non-data lines", () => {
    expect(parseSseEvent("event: message")).toBeNull();
    expect(parseSseEvent("")).toBeNull();
    expect(parseSseEvent(": comment")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseSseEvent("data: not-json")).toBeNull();
  });
});

// ── Message formatting ───────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; url: string; title: string }>;
}

function createUserMessage(content: string): ChatMessage {
  return {
    id: `msg-${Date.now()}`,
    role: "user",
    content: content.trim(),
    sources: undefined,
  };
}

function createAssistantMessage(): ChatMessage {
  return {
    id: `msg-${Date.now()}`,
    role: "assistant",
    content: "",
    sources: undefined,
  };
}

describe("Chat message creation", () => {
  it("creates user messages with trimmed content", () => {
    const msg = createUserMessage("  Hello world  ");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello world");
    expect(msg.id).toMatch(/^msg-/);
  });

  it("creates empty assistant messages for streaming", () => {
    const msg = createAssistantMessage();
    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe("");
  });

  it("user messages have no sources", () => {
    const msg = createUserMessage("test");
    expect(msg.sources).toBeUndefined();
  });
});

// ── Chat state management ────────────────────────────────────────────────────

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isOpen: boolean;
  threadId: string | null;
}

function initialChatState(): ChatState {
  return {
    messages: [],
    isStreaming: false,
    isOpen: false,
    threadId: null,
  };
}

type ChatAction =
  | { type: "TOGGLE" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "ADD_USER_MESSAGE"; content: string }
  | { type: "START_STREAMING" }
  | { type: "APPEND_DELTA"; delta: string }
  | {
      type: "SET_SOURCES";
      sources: Array<{ id: string; url: string; title: string }>;
    }
  | { type: "FINISH_STREAMING"; threadId: string }
  | { type: "STREAM_ERROR"; error: string }
  | { type: "CLEAR" };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "TOGGLE":
      return { ...state, isOpen: !state.isOpen };
    case "OPEN":
      return { ...state, isOpen: true };
    case "CLOSE":
      return { ...state, isOpen: false };
    case "ADD_USER_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, createUserMessage(action.content)],
      };
    case "START_STREAMING":
      return {
        ...state,
        isStreaming: true,
        messages: [...state.messages, createAssistantMessage()],
      };
    case "APPEND_DELTA": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = {
          ...last,
          content: last.content + action.delta,
        };
      }
      return { ...state, messages: msgs };
    }
    case "SET_SOURCES": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, sources: action.sources };
      }
      return { ...state, messages: msgs };
    }
    case "FINISH_STREAMING":
      return { ...state, isStreaming: false, threadId: action.threadId };
    case "STREAM_ERROR": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = {
          ...last,
          content: last.content || action.error,
        };
      }
      return { ...state, isStreaming: false, messages: msgs };
    }
    case "CLEAR":
      return { ...initialChatState(), isOpen: state.isOpen };
    default:
      return state;
  }
}

describe("Chat state reducer", () => {
  it("initializes with closed, empty state", () => {
    const state = initialChatState();
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.isOpen).toBe(false);
    expect(state.threadId).toBeNull();
  });

  it("toggles open/close", () => {
    let state = initialChatState();
    state = chatReducer(state, { type: "TOGGLE" });
    expect(state.isOpen).toBe(true);
    state = chatReducer(state, { type: "TOGGLE" });
    expect(state.isOpen).toBe(false);
  });

  it("adds user message", () => {
    let state = initialChatState();
    state = chatReducer(state, {
      type: "ADD_USER_MESSAGE",
      content: "What is MDX?",
    });
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe("user");
    expect(state.messages[0].content).toBe("What is MDX?");
  });

  it("starts streaming with empty assistant message", () => {
    let state = initialChatState();
    state = chatReducer(state, {
      type: "ADD_USER_MESSAGE",
      content: "Hi",
    });
    state = chatReducer(state, { type: "START_STREAMING" });
    expect(state.isStreaming).toBe(true);
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].role).toBe("assistant");
    expect(state.messages[1].content).toBe("");
  });

  it("appends deltas to the last assistant message", () => {
    let state = initialChatState();
    state = chatReducer(state, {
      type: "ADD_USER_MESSAGE",
      content: "Hi",
    });
    state = chatReducer(state, { type: "START_STREAMING" });
    state = chatReducer(state, { type: "APPEND_DELTA", delta: "Hello" });
    state = chatReducer(state, { type: "APPEND_DELTA", delta: " world" });
    expect(state.messages[1].content).toBe("Hello world");
  });

  it("sets sources on assistant message", () => {
    let state = initialChatState();
    state = chatReducer(state, {
      type: "ADD_USER_MESSAGE",
      content: "Hi",
    });
    state = chatReducer(state, { type: "START_STREAMING" });
    state = chatReducer(state, {
      type: "SET_SOURCES",
      sources: [{ id: "intro", url: "/intro", title: "Intro" }],
    });
    expect(state.messages[1].sources).toHaveLength(1);
  });

  it("finishes streaming and sets threadId", () => {
    let state = initialChatState();
    state = chatReducer(state, {
      type: "ADD_USER_MESSAGE",
      content: "Hi",
    });
    state = chatReducer(state, { type: "START_STREAMING" });
    state = chatReducer(state, {
      type: "FINISH_STREAMING",
      threadId: "thread-1",
    });
    expect(state.isStreaming).toBe(false);
    expect(state.threadId).toBe("thread-1");
  });

  it("handles stream errors", () => {
    let state = initialChatState();
    state = chatReducer(state, {
      type: "ADD_USER_MESSAGE",
      content: "Hi",
    });
    state = chatReducer(state, { type: "START_STREAMING" });
    state = chatReducer(state, {
      type: "STREAM_ERROR",
      error: "Something went wrong",
    });
    expect(state.isStreaming).toBe(false);
    expect(state.messages[1].content).toBe("Something went wrong");
  });

  it("clears messages but preserves open state", () => {
    let state = initialChatState();
    state = chatReducer(state, { type: "OPEN" });
    state = chatReducer(state, {
      type: "ADD_USER_MESSAGE",
      content: "Hi",
    });
    state = chatReducer(state, { type: "CLEAR" });
    expect(state.messages).toEqual([]);
    expect(state.isOpen).toBe(true);
    expect(state.threadId).toBeNull();
  });
});

// ── Request body building ────────────────────────────────────────────────────

function buildChatRequestBody(
  messages: ChatMessage[],
  threadId: string | null,
  currentPath: string | null,
): {
  fp: string;
  messages: Array<{ id: string; role: string; content: string }>;
  threadId: string | null;
  currentPath: string | null;
} {
  return {
    fp: "docs-widget",
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
    threadId,
    currentPath,
  };
}

describe("Chat request body builder", () => {
  it("builds correct request with messages and threadId", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi there" },
      { id: "3", role: "user", content: "What is MDX?" },
    ];
    const body = buildChatRequestBody(messages, "thread-1", "/getting-started");
    expect(body.fp).toBe("docs-widget");
    expect(body.messages).toHaveLength(3);
    expect(body.threadId).toBe("thread-1");
    expect(body.currentPath).toBe("/getting-started");
  });

  it("strips source metadata from messages", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "assistant",
        content: "Check this out",
        sources: [{ id: "x", url: "/x", title: "X" }],
      },
    ];
    const body = buildChatRequestBody(messages, null, null);
    const firstMsg = body.messages[0] as Record<string, unknown>;
    expect(firstMsg.sources).toBeUndefined();
  });
});
