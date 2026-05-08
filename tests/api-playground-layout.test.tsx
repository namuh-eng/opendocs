import { ApiPlayground } from "@/components/docs/api-playground";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ApiPlayground response tabs", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("updates response tab ARIA state and panels on click", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ApiPlayground html={apiPlaygroundTabsHtml()} />);
    });

    const bodyTab = container.querySelector<HTMLButtonElement>(
      '[data-resp-tab="body"]',
    );
    const headersTab = container.querySelector<HTMLButtonElement>(
      '[data-resp-tab="headers"]',
    );
    const bodyPanel =
      container.querySelector<HTMLElement>(".api-response-body");
    const headersPanel = container.querySelector<HTMLElement>(
      ".api-response-headers",
    );

    expect(bodyTab?.getAttribute("aria-selected")).toBe("true");
    expect(bodyTab?.tabIndex).toBe(0);
    expect(bodyPanel?.style.display).not.toBe("none");
    expect(headersTab?.getAttribute("aria-selected")).toBe("false");
    expect(headersTab?.tabIndex).toBe(-1);
    expect(headersPanel?.style.display).toBe("none");

    await act(async () => {
      headersTab?.click();
    });

    expect(bodyTab?.getAttribute("aria-selected")).toBe("false");
    expect(bodyTab?.tabIndex).toBe(-1);
    expect(bodyPanel?.style.display).toBe("none");
    expect(headersTab?.getAttribute("aria-selected")).toBe("true");
    expect(headersTab?.tabIndex).toBe(0);
    expect(headersPanel?.style.display).toBe("block");
  });

  it("supports keyboard navigation for response tabs", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ApiPlayground html={apiPlaygroundTabsHtml()} />);
    });

    const bodyTab = container.querySelector<HTMLButtonElement>(
      '[data-resp-tab="body"]',
    );
    const headersTab = container.querySelector<HTMLButtonElement>(
      '[data-resp-tab="headers"]',
    );

    await act(async () => {
      bodyTab?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });

    expect(headersTab?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(headersTab);

    await act(async () => {
      headersTab?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });

    expect(bodyTab?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(bodyTab);
  });
});

function apiPlaygroundTabsHtml() {
  return `
    <div class="api-playground">
      <div class="api-response" style="display:block">
        <div class="api-response-tabs" role="tablist" aria-label="Response sections">
          <button type="button" id="api-response-body-tab" class="api-resp-tab active" data-resp-tab="body" role="tab" aria-selected="true" aria-controls="api-response-body-panel" tabindex="0" aria-label="Show response body">Body</button>
          <button type="button" id="api-response-headers-tab" class="api-resp-tab" data-resp-tab="headers" role="tab" aria-selected="false" aria-controls="api-response-headers-panel" tabindex="-1" aria-label="Show response headers">Headers</button>
        </div>
        <div id="api-response-body-panel" class="api-response-body" role="tabpanel" aria-labelledby="api-response-body-tab" aria-label="Response body">
          <pre><code class="api-response-content">{}</code></pre>
        </div>
        <div id="api-response-headers-panel" class="api-response-headers" role="tabpanel" aria-labelledby="api-response-headers-tab" aria-label="Response headers" style="display:none">
          <pre><code class="api-response-headers-content"></code></pre>
        </div>
      </div>
    </div>
  `;
}
