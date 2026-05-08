import { FeedbackWidget } from "@/components/docs/feedback-widget";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { validateFeedbackPayload } from "../src/lib/feedback";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// ── Feedback API validation logic ────────────────────────────────────────────

describe("Feedback payload validation", () => {
  it("accepts valid helpful feedback without comment", () => {
    const result = validateFeedbackPayload({
      page: "/getting-started",
      rating: "helpful",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rating).toBe("helpful");
      expect(result.data.page).toBe("/getting-started");
      expect(result.data.comment).toBeUndefined();
    }
  });

  it("accepts valid not_helpful feedback with comment", () => {
    const result = validateFeedbackPayload({
      page: "/api-reference/auth",
      rating: "not_helpful",
      comment: "Missing examples for OAuth flow",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rating).toBe("not_helpful");
      expect(result.data.comment).toBe("Missing examples for OAuth flow");
    }
  });

  it("rejects missing page", () => {
    const result = validateFeedbackPayload({ rating: "helpful" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("page");
  });

  it("rejects empty page string", () => {
    const result = validateFeedbackPayload({ page: "  ", rating: "helpful" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid rating", () => {
    const result = validateFeedbackPayload({
      page: "/docs",
      rating: "thumbs_up",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("rating");
  });

  it("rejects null body", () => {
    const result = validateFeedbackPayload(null);
    expect(result.ok).toBe(false);
  });

  it("truncates long comments to 2000 chars", () => {
    const longComment = "x".repeat(3000);
    const result = validateFeedbackPayload({
      page: "/docs",
      rating: "helpful",
      comment: longComment,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.comment?.length).toBe(2000);
    }
  });

  it("rejects non-string comment", () => {
    const result = validateFeedbackPayload({
      page: "/docs",
      rating: "helpful",
      comment: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("comment");
  });

  it("trims page whitespace", () => {
    const result = validateFeedbackPayload({
      page: "  /getting-started  ",
      rating: "helpful",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe("/getting-started");
    }
  });
});

// ── Feedback widget state machine ────────────────────────────────────────────

type WidgetState = "idle" | "rated" | "submitting" | "submitted";

interface WidgetStore {
  state: WidgetState;
  rating: "helpful" | "not_helpful" | null;
  comment: string;
  showTextInput: boolean;
}

function createInitialState(): WidgetStore {
  return { state: "idle", rating: null, comment: "", showTextInput: false };
}

function handleRate(
  store: WidgetStore,
  rating: "helpful" | "not_helpful",
): WidgetStore {
  return { ...store, state: "rated", rating, showTextInput: true };
}

function handleCommentChange(store: WidgetStore, text: string): WidgetStore {
  return { ...store, comment: text };
}

function handleSubmitStart(store: WidgetStore): WidgetStore {
  return { ...store, state: "submitting" };
}

function handleSubmitSuccess(store: WidgetStore): WidgetStore {
  return { ...store, state: "submitted" };
}

describe("Feedback widget state machine", () => {
  it("starts in idle state with no rating", () => {
    const state = createInitialState();
    expect(state.state).toBe("idle");
    expect(state.rating).toBeNull();
    expect(state.showTextInput).toBe(false);
  });

  it("transitions to rated state on thumbs up", () => {
    let state = createInitialState();
    state = handleRate(state, "helpful");
    expect(state.state).toBe("rated");
    expect(state.rating).toBe("helpful");
    expect(state.showTextInput).toBe(true);
  });

  it("transitions to rated state on thumbs down", () => {
    let state = createInitialState();
    state = handleRate(state, "not_helpful");
    expect(state.state).toBe("rated");
    expect(state.rating).toBe("not_helpful");
  });

  it("allows changing comment text in rated state", () => {
    let state = createInitialState();
    state = handleRate(state, "helpful");
    state = handleCommentChange(state, "Great docs!");
    expect(state.comment).toBe("Great docs!");
    expect(state.state).toBe("rated");
  });

  it("transitions to submitting then submitted", () => {
    let state = createInitialState();
    state = handleRate(state, "not_helpful");
    state = handleCommentChange(state, "Needs more detail");
    state = handleSubmitStart(state);
    expect(state.state).toBe("submitting");
    state = handleSubmitSuccess(state);
    expect(state.state).toBe("submitted");
  });

  it("preserves rating through submission flow", () => {
    let state = createInitialState();
    state = handleRate(state, "helpful");
    state = handleSubmitStart(state);
    state = handleSubmitSuccess(state);
    expect(state.rating).toBe("helpful");
  });
});

describe("Feedback widget visible choices", () => {
  it("renders explicit Yes and No labels while preserving accessible names", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(FeedbackWidget, {
          subdomain: "test-project",
          pagePath: "introduction",
        }),
      );
    });

    const helpful = container.querySelector<HTMLButtonElement>(
      '[data-testid="feedback-thumbs-up"]',
    );
    const notHelpful = container.querySelector<HTMLButtonElement>(
      '[data-testid="feedback-thumbs-down"]',
    );

    expect(helpful?.textContent).toContain("Yes");
    expect(helpful?.getAttribute("aria-label")).toBe(
      "Yes, this page was helpful",
    );
    expect(notHelpful?.textContent).toContain("No");
    expect(notHelpful?.getAttribute("aria-label")).toBe(
      "No, this page was not helpful",
    );

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("labels the optional feedback comment textarea with the visible prompt", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(FeedbackWidget, {
          subdomain: "test-project",
          pagePath: "introduction",
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="feedback-thumbs-down"]',
        )
        ?.click();
    });

    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="feedback-textarea"]',
    );
    const label = container.querySelector<HTMLElement>(
      ".docs-feedback-comment-label",
    );

    expect(label?.textContent).toBe("Sorry to hear that. How can we improve?");
    expect(label?.id).toBeTruthy();
    expect(textarea?.getAttribute("aria-labelledby")).toBe(label?.id);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
