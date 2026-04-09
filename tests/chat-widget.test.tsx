import { ChatWidget } from "@/components/docs/chat-widget";
import { AskAiButton } from "@/components/docs/docs-topbar";
import { MdxContent } from "@/components/docs/mdx-content";
import { renderMdxContent } from "@/lib/mdx-renderer";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Docs chat widget code context", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  it("opens the chat panel when the topbar Ask AI button is clicked", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <>
          <AskAiButton />
          <ChatWidget subdomain="feature004-qa" currentPath="introduction" />
        </>,
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="ask-ai-btn"]')
        ?.click();
    });

    expect(
      container.querySelector('[data-testid="chat-panel"]'),
    ).not.toBeNull();
  });

  it("opens the chat panel with code context when a code-block Ask AI button is clicked", async () => {
    const html = renderMdxContent("```ts app.ts\nconst answer = 42;\n```");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <>
          <MdxContent html={html} />
          <ChatWidget subdomain="feature004-qa" currentPath="introduction" />
        </>,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".code-ask-ai")?.click();
    });

    const input = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="chat-input"]',
    );
    expect(input).not.toBeNull();
    expect(input?.value).toContain("Explain this ts code:");
    expect(input?.value).toContain("```ts");
    expect(input?.value).toContain("const answer = 42;");
  });
});
