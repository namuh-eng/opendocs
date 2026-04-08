"use client";

import { useEffect, useRef } from "react";

interface ApiReferenceLayoutProps {
  html: string;
}

/**
 * Client component that renders server-generated API reference HTML
 * and wires up interactivity: language tab switching, code copying,
 * response status tab switching, Try it button dispatch.
 */
export function ApiReferenceLayout({ html }: ApiReferenceLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: html triggers re-wiring
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Language tab switching ──────────────────────────────────────────
    const langTabs =
      container.querySelectorAll<HTMLButtonElement>(".api-ref-lang-tab");
    const codeBlocks = container.querySelectorAll<HTMLDivElement>(
      ".api-ref-code-block",
    );

    for (const tab of langTabs) {
      tab.addEventListener("click", () => {
        const lang = tab.dataset.lang;
        // Deactivate all tabs and blocks
        for (const t of langTabs) t.classList.remove("active");
        for (const b of codeBlocks) b.classList.remove("active");
        // Activate selected
        tab.classList.add("active");
        const target = container.querySelector<HTMLDivElement>(
          `.api-ref-code-block[data-lang="${lang}"]`,
        );
        if (target) target.classList.add("active");

        // Update copy button label
        const copyBtn = container.querySelector<HTMLButtonElement>(
          ".api-ref-copy-btn span",
        );
        if (copyBtn) copyBtn.textContent = tab.textContent || "cURL";
      });
    }

    // ── Copy button ────────────────────────────────────────────────────
    const copyBtns =
      container.querySelectorAll<HTMLButtonElement>(".api-ref-copy-btn");
    for (const btn of copyBtns) {
      btn.addEventListener("click", () => {
        const activeBlock = container.querySelector<HTMLDivElement>(
          ".api-ref-code-block.active",
        );
        const code = activeBlock?.querySelector("code")?.textContent || "";
        navigator.clipboard.writeText(code).then(() => {
          const span = btn.querySelector("span");
          if (span) {
            const original = span.textContent;
            span.textContent = "Copied!";
            setTimeout(() => {
              span.textContent = original;
            }, 1500);
          }
        });
      });
    }

    // ── Ask AI button ──────────────────────────────────────────────────
    const askAiBtns =
      container.querySelectorAll<HTMLButtonElement>(".api-ref-askai-btn");
    for (const btn of askAiBtns) {
      btn.addEventListener("click", () => {
        const activeBlock = container.querySelector<HTMLDivElement>(
          ".api-ref-code-block.active",
        );
        const code = activeBlock?.querySelector("code")?.textContent || "";
        const lang = activeBlock?.dataset.lang || "curl";
        window.dispatchEvent(
          new CustomEvent("ask-ai-code", { detail: { code, language: lang } }),
        );
      });
    }

    // ── Response status tab switching ──────────────────────────────────
    const statusTabs = container.querySelectorAll<HTMLButtonElement>(
      ".api-ref-status-tab",
    );
    const statusPanels = container.querySelectorAll<HTMLDivElement>(
      ".api-ref-status-panel",
    );

    for (const tab of statusTabs) {
      tab.addEventListener("click", () => {
        const status = tab.dataset.status;
        for (const t of statusTabs) t.classList.remove("active");
        for (const p of statusPanels) p.classList.remove("active");
        tab.classList.add("active");
        const target = container.querySelector<HTMLDivElement>(
          `.api-ref-status-panel[data-status="${status}"]`,
        );
        if (target) target.classList.add("active");
      });
    }

    // ── Try it button ──────────────────────────────────────────────────
    const tryItBtns =
      container.querySelectorAll<HTMLButtonElement>(".api-ref-tryit-btn");
    for (const btn of tryItBtns) {
      btn.addEventListener("click", () => {
        // Scroll to the API playground section if it exists
        const playground = document.querySelector(".api-playground");
        if (playground) {
          playground.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="api-ref-layout"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered HTML
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
