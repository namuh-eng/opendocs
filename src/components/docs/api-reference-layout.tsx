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

    const activateLanguageTab = (tab: HTMLButtonElement) => {
      const lang = tab.dataset.lang;
      // Deactivate all tabs and blocks
      for (const t of langTabs) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
        t.tabIndex = -1;
      }
      for (const b of codeBlocks) {
        b.classList.remove("active");
        b.hidden = true;
      }
      // Activate selected
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      tab.tabIndex = 0;
      const target = container.querySelector<HTMLDivElement>(
        `.api-ref-code-block[data-lang="${lang}"]`,
      );
      if (target) {
        target.classList.add("active");
        target.hidden = false;
      }

      // Update copy button label
      const copyBtn = container.querySelector<HTMLButtonElement>(
        ".api-ref-copy-btn span",
      );
      if (copyBtn) copyBtn.textContent = tab.textContent || "cURL";
    };

    const moveLanguageTabFocus = (
      tab: HTMLButtonElement,
      direction: "first" | "last" | "next" | "previous",
    ) => {
      const tabs = Array.from(langTabs);
      const currentIndex = tabs.indexOf(tab);
      if (currentIndex === -1) return;

      const targetIndex =
        direction === "first"
          ? 0
          : direction === "last"
            ? tabs.length - 1
            : direction === "next"
              ? (currentIndex + 1) % tabs.length
              : (currentIndex - 1 + tabs.length) % tabs.length;

      const target = tabs[targetIndex];
      target.focus();
      activateLanguageTab(target);
    };

    for (const tab of langTabs) {
      tab.addEventListener("click", () => activateLanguageTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          moveLanguageTabFocus(tab, "next");
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          moveLanguageTabFocus(tab, "previous");
        } else if (event.key === "Home") {
          event.preventDefault();
          moveLanguageTabFocus(tab, "first");
        } else if (event.key === "End") {
          event.preventDefault();
          moveLanguageTabFocus(tab, "last");
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          tab.classList.add("active");
          activateLanguageTab(tab);
        }
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
        document.dispatchEvent(
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
        for (const t of statusTabs) {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
          t.tabIndex = -1;
        }
        for (const p of statusPanels) {
          p.classList.remove("active");
          p.hidden = true;
        }
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        tab.tabIndex = 0;
        const target = container.querySelector<HTMLDivElement>(
          `.api-ref-status-panel[data-status="${status}"]`,
        );
        if (target) {
          target.classList.add("active");
          target.hidden = false;
        }
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
