import { ApiReferenceLayout } from "@/components/docs/api-reference-layout";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ApiReferenceLayout", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("updates code language tab ARIA state and panels on click", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ApiReferenceLayout html={apiReferenceTabsHtml()} />);
    });

    const curlTab =
      container.querySelector<HTMLButtonElement>('[data-lang="curl"]');
    const pythonTab = container.querySelector<HTMLButtonElement>(
      '[data-lang="python"]',
    );
    const curlPanel = container.querySelector<HTMLDivElement>(
      '[data-lang="curl"].api-ref-code-block',
    );
    const pythonPanel = container.querySelector<HTMLDivElement>(
      '[data-lang="python"].api-ref-code-block',
    );

    expect(curlTab?.getAttribute("aria-selected")).toBe("true");
    expect(curlTab?.tabIndex).toBe(0);
    expect(curlPanel?.hidden).toBe(false);
    expect(pythonTab?.getAttribute("aria-selected")).toBe("false");
    expect(pythonTab?.tabIndex).toBe(-1);
    expect(pythonPanel?.hidden).toBe(true);

    await act(async () => {
      pythonTab?.click();
    });

    expect(curlTab?.getAttribute("aria-selected")).toBe("false");
    expect(curlTab?.tabIndex).toBe(-1);
    expect(curlPanel?.hidden).toBe(true);
    expect(pythonTab?.getAttribute("aria-selected")).toBe("true");
    expect(pythonTab?.tabIndex).toBe(0);
    expect(pythonPanel?.hidden).toBe(false);
  });

  it("supports keyboard navigation for code language tabs", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ApiReferenceLayout html={apiReferenceTabsHtml()} />);
    });

    const curlTab =
      container.querySelector<HTMLButtonElement>('[data-lang="curl"]');
    const pythonTab = container.querySelector<HTMLButtonElement>(
      '[data-lang="python"]',
    );

    await act(async () => {
      curlTab?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });

    expect(pythonTab?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(pythonTab);

    await act(async () => {
      pythonTab?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });

    expect(curlTab?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(curlTab);
  });
});

function apiReferenceTabsHtml() {
  return `
    <div class="api-ref-code-section">
      <div class="api-ref-lang-tabs" role="tablist" aria-label="Code examples">
        <button id="api-ref-lang-tab-curl" class="api-ref-lang-tab active" data-lang="curl" role="tab" aria-selected="true" aria-controls="api-ref-code-panel-curl" tabindex="0">cURL</button>
        <button id="api-ref-lang-tab-python" class="api-ref-lang-tab" data-lang="python" role="tab" aria-selected="false" aria-controls="api-ref-code-panel-python" tabindex="-1">Python</button>
      </div>
      <button class="api-ref-copy-btn"><span>cURL</span></button>
      <div id="api-ref-code-panel-curl" class="api-ref-code-block active" data-lang="curl" role="tabpanel" aria-labelledby="api-ref-lang-tab-curl">
        <pre><code>curl --request GET</code></pre>
      </div>
      <div id="api-ref-code-panel-python" class="api-ref-code-block" data-lang="python" role="tabpanel" aria-labelledby="api-ref-lang-tab-python" hidden>
        <pre><code>import requests</code></pre>
      </div>
    </div>
  `;
}
