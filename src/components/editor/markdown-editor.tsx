"use client";

import { generateLineNumbers } from "@/lib/editor";
import { useCallback, useRef, useSyncExternalStore } from "react";

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
    },
    [onChange],
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
        });
      }
    },
    [value, onChange],
  );

  return (
    <div
      className="flex h-full overflow-hidden bg-[#0a0a0a]"
      data-testid="markdown-editor"
    >
      {/* Line numbers gutter */}
      <div
        ref={lineNumbersRef}
        className="flex flex-col items-end py-4 px-3 text-xs font-mono text-gray-600 select-none overflow-hidden border-r border-white/[0.06] bg-[#0a0a0a] shrink-0"
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
        className="flex-1 bg-transparent text-emerald-300 text-sm font-mono py-4 px-4 resize-none focus:outline-none leading-[1.625rem] overflow-auto"
        spellCheck={false}
        placeholder="Write your MDX content here..."
        data-testid="markdown-textarea"
      />
    </div>
  );
}
