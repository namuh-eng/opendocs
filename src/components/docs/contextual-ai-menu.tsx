"use client";

import {
  type AiTool,
  type ContextualAiMenuConfig,
  buildAiToolUrl,
  getEnabledAiTools,
} from "@/lib/contextual-ai-menu";
import { pageToMarkdown } from "@/lib/page-chrome";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ContextualAiMenuProps {
  config: ContextualAiMenuConfig;
  title: string;
  content: string;
  pageUrl: string;
}

export function ContextualAiMenu({
  config,
  title,
  content,
  pageUrl,
}: ContextualAiMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const enabledTools = getEnabledAiTools(config);

  const handleToolClick = useCallback(
    (tool: AiTool) => {
      const markdown = pageToMarkdown(title, content);
      const url = buildAiToolUrl(tool.id, markdown, pageUrl);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setOpen(false);
    },
    [title, content, pageUrl],
  );

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (enabledTools.length === 0) return null;

  return (
    <div className="page-actions-dropdown" ref={menuRef}>
      <button
        type="button"
        data-testid="ai-menu-btn"
        className="page-action-btn"
        onClick={() => setOpen(!open)}
        title="Open in AI tool"
      >
        <Sparkles size={16} />
      </button>

      {open && (
        <div className="page-actions-menu" data-testid="ai-menu-dropdown">
          <div className="ai-menu-header">Open in AI</div>
          {enabledTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="page-actions-menu-item"
              data-testid={`ai-tool-${tool.id}`}
              onClick={() => handleToolClick(tool)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
