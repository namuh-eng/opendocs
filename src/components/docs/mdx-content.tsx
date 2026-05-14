"use client";

import { useEffect, useRef } from "react";

interface MdxContentProps {
  html: string;
}

/**
 * Renders pre-compiled MDX HTML and adds client-side interactivity
 * for tabs, code copy buttons, and accordion toggles.
 */
export function MdxContent({ html }: MdxContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: html triggers re-wiring of event listeners when content changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Imported READMEs often include dynamic GitHub shields that render as
    // "invalid" when the source repo is private, renamed, or unavailable. Hide
    // those volatile social/count badges rather than surfacing broken chrome at
    // the top of generated docs pages.
    const volatileBadgeImages = container.querySelectorAll<HTMLImageElement>(
      'img[src*="img.shields.io/github/stars"], img[src*="img.shields.io/github/issues"]',
    );
    for (const img of volatileBadgeImages) {
      const parentAnchor = img.parentElement;
      if (
        parentAnchor?.tagName === "A" &&
        parentAnchor.textContent?.trim() === ""
      ) {
        parentAnchor.remove();
      } else {
        img.remove();
      }
    }

    // Wire up tab switching
    const tabButtons = container.querySelectorAll<HTMLButtonElement>(
      ".tab-bar .tab-button",
    );
    for (const btn of tabButtons) {
      btn.addEventListener("click", () => {
        const tabIndex = btn.dataset.tab;
        const tabContainer = btn.closest(".tabs, .code-group, .view");
        if (!tabContainer || tabIndex === undefined) return;

        // Deactivate all tabs and panels in this container
        const allButtons =
          tabContainer.querySelectorAll<HTMLButtonElement>(".tab-button");
        const allPanels =
          tabContainer.querySelectorAll<HTMLDivElement>(".tab-panel");

        for (const b of allButtons) b.classList.remove("active");
        for (const p of allPanels) p.classList.remove("active");

        // Activate selected
        btn.classList.add("active");
        const panel = tabContainer.querySelector(
          `.tab-panel[data-tab="${tabIndex}"]`,
        );
        if (panel) panel.classList.add("active");
      });
    }

    // Wire up code copy buttons (in both code-block and code-group)
    const copyButtons =
      container.querySelectorAll<HTMLButtonElement>(".code-copy");
    for (const btn of copyButtons) {
      btn.addEventListener("click", () => {
        const codeContainer =
          btn.closest(".code-block") || btn.closest(".tab-panel");
        const code = codeContainer?.querySelector("code");
        if (code) {
          navigator.clipboard.writeText(code.textContent || "");
          const originalText = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      });
    }

    // Wire up Ask AI buttons
    const askAiButtons =
      container.querySelectorAll<HTMLButtonElement>(".code-ask-ai");
    for (const btn of askAiButtons) {
      btn.addEventListener("click", () => {
        const codeBlock = btn.closest(".code-block");
        const code = codeBlock?.querySelector("code");
        const lang = codeBlock?.getAttribute("data-language") || "";
        if (code) {
          const codeText = code.textContent || "";
          // Dispatch custom event for parent to handle
          const event = new CustomEvent("ask-ai-code", {
            bubbles: true,
            detail: { code: codeText, language: lang },
          });
          btn.dispatchEvent(event);
        }
      });
    }

    // Wire up banner dismiss buttons
    const bannerDismissButtons =
      container.querySelectorAll<HTMLButtonElement>(".banner-dismiss");
    for (const btn of bannerDismissButtons) {
      btn.addEventListener("click", () => {
        const banner = btn.closest(".banner");
        if (banner) {
          (banner as HTMLElement).style.display = "none";
        }
      });
    }

    // Render Mermaid diagrams client-side
    const mermaidBlocks =
      container.querySelectorAll<HTMLPreElement>("pre.mermaid");
    if (mermaidBlocks.length > 0) {
      import("mermaid").then((mod) => {
        const mermaid = mod.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor:
              getComputedStyle(container)
                .getPropertyValue("--docs-primary")
                .trim() || "#7b8fde",
            primaryTextColor: "#e5e7eb",
            lineColor: "#6b7280",
          },
        });
        for (const block of mermaidBlocks) {
          const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
          const graphDef = block.textContent || "";
          mermaid.render(id, graphDef).then(({ svg }) => {
            block.innerHTML = svg;
          });
        }
      });
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="docs-content prose"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: MDX content is server-generated from trusted source (DB content authored by project owners)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
