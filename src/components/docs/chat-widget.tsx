"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; url: string; title: string }>;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isOpen: boolean;
  threadId: string | null;
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

// ── Reducer ──────────────────────────────────────────────────────────────────

function createUserMessage(content: string): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "user",
    content: content.trim(),
  };
}

function createAssistantMessage(): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "assistant",
    content: "",
  };
}

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
      return {
        messages: [],
        isStreaming: false,
        isOpen: state.isOpen,
        threadId: null,
      };
    default:
      return state;
  }
}

// ── SSE Parsing ──────────────────────────────────────────────────────────────

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

// ── Chat Widget Component ────────────────────────────────────────────────────

interface ChatWidgetProps {
  subdomain: string;
  currentPath?: string;
}

export function ChatWidget({ subdomain, currentPath }: ChatWidgetProps) {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isStreaming: false,
    isOpen: false,
    threadId: null,
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Listen for toggle-ask-ai custom event from topbar button
  useEffect(() => {
    const handler = () => dispatch({ type: "TOGGLE" });
    document.addEventListener("toggle-ask-ai", handler);
    return () => document.removeEventListener("toggle-ask-ai", handler);
  }, []);

  // Open the assistant with a code-aware draft when Ask AI is clicked
  useEffect(() => {
    const handler = (
      event: Event | CustomEvent<{ code?: string; language?: string }>,
    ) => {
      const detail = "detail" in event ? event.detail : undefined;
      const code = detail?.code?.trim();
      if (!code) return;

      const language = detail?.language?.trim() || "text";
      const prompt = `Explain this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;

      dispatch({ type: "OPEN" });
      setInput((current) =>
        current.trim() ? `${current}\n\n${prompt}` : prompt,
      );
    };

    document.addEventListener("ask-ai-code", handler as EventListener);
    return () =>
      document.removeEventListener("ask-ai-code", handler as EventListener);
  }, []);

  // Auto-scroll to bottom on new messages
  const scrollKey = `${state.messages.length}-${state.messages[state.messages.length - 1]?.content.length ?? 0}`;
  useEffect(() => {
    // scrollKey triggers re-scroll when messages change
    if (scrollKey) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [scrollKey]);

  // Focus input when panel opens
  useEffect(() => {
    if (state.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.isOpen]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || state.isStreaming) return;

    setInput("");
    dispatch({ type: "ADD_USER_MESSAGE", content: trimmed });
    dispatch({ type: "START_STREAMING" });

    // Build messages for request (current messages + new user message)
    const requestMessages = [
      ...state.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
      {
        id: `msg-${Date.now()}`,
        role: "user",
        content: trimmed,
      },
    ];

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(`/api/docs/${subdomain}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fp: "docs-widget",
          messages: requestMessages,
          threadId: state.threadId,
          currentPath: currentPath || null,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        dispatch({
          type: "STREAM_ERROR",
          error: "Failed to get a response. Please try again.",
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        dispatch({ type: "STREAM_ERROR", error: "No response stream." });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const event = parseSseEvent(line.trim());
          if (!event) continue;

          switch (event.type) {
            case "text-delta":
              if (event.textDelta) {
                dispatch({ type: "APPEND_DELTA", delta: event.textDelta });
              }
              break;
            case "sources":
              if (event.sources) {
                dispatch({ type: "SET_SOURCES", sources: event.sources });
              }
              break;
            case "finish":
              dispatch({
                type: "FINISH_STREAMING",
                threadId: event.threadId || "",
              });
              break;
            case "error":
              dispatch({
                type: "STREAM_ERROR",
                error: event.error || "An error occurred.",
              });
              break;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        dispatch({
          type: "STREAM_ERROR",
          error: "Connection error. Please try again.",
        });
      }
    }
  }, [
    input,
    state.isStreaming,
    state.messages,
    state.threadId,
    subdomain,
    currentPath,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!state.isOpen) return null;

  return (
    <div className="chat-widget" data-testid="chat-panel">
      {/* Header */}
      <div className="chat-widget-header">
        <div className="chat-widget-header-left">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
          </svg>
          <span>AI Assistant</span>
        </div>
        <div className="chat-widget-header-actions">
          <button
            type="button"
            data-testid="chat-clear-btn"
            className="chat-widget-icon-btn"
            title="Clear conversation"
            onClick={() => dispatch({ type: "CLEAR" })}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
          <button
            type="button"
            data-testid="chat-close-btn"
            className="chat-widget-icon-btn"
            title="Close"
            onClick={() => dispatch({ type: "CLOSE" })}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-widget-messages">
        {state.messages.length === 0 && (
          <div className="chat-widget-empty">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
            </svg>
            <p>Ask a question about the documentation</p>
          </div>
        )}

        {state.messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
            <div className="chat-message-avatar">
              {msg.role === "user" ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                </svg>
              )}
            </div>
            <div className="chat-message-body">
              <div className="chat-message-content">
                {msg.content || (
                  <span className="chat-typing-indicator">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="chat-message-sources">
                  <span className="chat-sources-label">Sources:</span>
                  {msg.sources.map((source) => (
                    <a
                      key={source.id}
                      href={`/docs/${subdomain}/${source.id}`}
                      className="chat-source-link"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {state.isStreaming && (
          <div className="chat-streaming-indicator">AI is thinking...</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="chat-widget-disclaimer">
        Responses are generated using AI and may contain mistakes.
      </div>

      {/* Input */}
      <div className="chat-widget-input-area">
        <textarea
          ref={inputRef}
          data-testid="chat-input"
          className="chat-widget-textarea"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={state.isStreaming}
        />
        <button
          type="button"
          data-testid="chat-send-btn"
          className="chat-widget-send-btn"
          disabled={!input.trim() || state.isStreaming}
          onClick={sendMessage}
          title="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
