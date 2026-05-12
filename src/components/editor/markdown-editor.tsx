"use client";

import { generateLineNumbers } from "@/lib/editor";
import { useCallback, useRef } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (pos: number) => void;
}

export function MarkdownEditor({
  value,
  onChange,
  onCursorChange,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const lineNumbers = generateLineNumbers(value);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      onCursorChange?.(e.target.selectionStart);
    },
    [onChange, onCursorChange],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (onCursorChange) {
        onCursorChange(e.currentTarget.selectionStart);
      }
    },
    [onCursorChange],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (onCursorChange) {
        onCursorChange(e.currentTarget.selectionStart);
      }
    },
    [onCursorChange],
  );

  // Handle Tab key to insert spaces instead of changing focus
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = `${value.slice(0, start)}  ${value.slice(end)}`;
        onChange(newValue);
        // Set cursor after inserted spaces
        requestAnimationFrame(() => {
          target.selectionStart = start + 2;
          target.selectionEnd = start + 2;
          onCursorChange?.(start + 2);
        });
      }
    },
    [value, onChange, onCursorChange],
  );

  return (
    <div
      className="flex h-full overflow-hidden bg-[var(--od-editor-bg)]"
      data-testid="markdown-editor"
    >
      {/* Line numbers gutter */}
      <div
        ref={lineNumbersRef}
        className="flex flex-col items-end py-4 px-3 text-xs font-mono text-[var(--od-code-comment)] select-none overflow-hidden border-r border-[var(--od-code-border)] bg-[var(--od-code-bg)] shrink-0"
        data-testid="line-numbers"
        aria-hidden="true"
      >
        {lineNumbers.map((num) => (
          <div key={num} className="leading-[1.625rem] h-[1.625rem]">
            {num}
          </div>
        ))}
      </div>

      {/* Code textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        className="mx-auto max-w-4xl flex-1 resize-none overflow-auto bg-transparent px-6 py-8 font-mono text-sm leading-[1.75rem] text-[var(--od-editor-text)] focus:outline-none"
        spellCheck={false}
        placeholder="Write your MDX content here..."
        data-testid="markdown-textarea"
      />
    </div>
  );
}
