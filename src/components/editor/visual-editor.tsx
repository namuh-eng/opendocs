"use client";

import CodeBlock from "@tiptap/extension-code-block";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

interface VisualEditorProps {
  content: string;
  onChange: (markdown: string) => void;
}

/** Convert simple markdown to HTML for Tiptap. */
function markdownToHtml(md: string): string {
  let html = md;

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");

  // Code blocks (triple backticks)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) => `<pre><code>${code.trim()}</code></pre>`,
  );

  // Paragraphs — wrap remaining lines
  const lines = html.split("\n");
  const result: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (
      line.startsWith("<h") ||
      line.startsWith("<hr") ||
      line.startsWith("<pre") ||
      line.startsWith("<ul") ||
      line.startsWith("<ol")
    ) {
      inBlock = true;
      result.push(line);
      if (
        line.includes("</pre>") ||
        line.includes("</ul>") ||
        line.includes("</ol>")
      ) {
        inBlock = false;
      }
    } else if (inBlock) {
      result.push(line);
      if (
        line.includes("</pre>") ||
        line.includes("</ul>") ||
        line.includes("</ol>")
      ) {
        inBlock = false;
      }
    } else if (line.trim() === "") {
      result.push("");
    } else if (!line.startsWith("<")) {
      result.push(`<p>${line}</p>`);
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

/** Convert Tiptap HTML back to markdown. */
function htmlToMarkdown(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1");

  // Bold and italic
  md = md.replace(/<strong><em>(.*?)<\/em><\/strong>/gi, "***$1***");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");

  // Inline code
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");

  // Code blocks
  md = md.replace(
    /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    "```\n$1\n```",
  );

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, "---");

  // Paragraphs
  md = md.replace(/<p>(.*?)<\/p>/gi, "$1");

  // Lists
  md = md.replace(/<li>(.*?)<\/li>/gi, "- $1");
  md = md.replace(/<\/?[uo]l>/gi, "");

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up excessive newlines
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}

export function VisualEditor({ content, onChange }: VisualEditorProps) {
  const isUpdating = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class:
            "bg-[#1a1a1a] rounded-lg p-4 font-mono text-sm text-emerald-300 my-4",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-emerald-400 underline hover:text-emerald-300",
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Start writing your documentation...",
      }),
    ],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none px-6 py-4 focus:outline-none min-h-full " +
          "prose-headings:text-white prose-p:text-gray-300 prose-a:text-emerald-400 " +
          "prose-strong:text-white prose-code:text-emerald-300 prose-code:bg-[#1a1a1a] " +
          "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm " +
          "prose-hr:border-white/[0.08] prose-blockquote:border-emerald-500 prose-blockquote:text-gray-400",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isUpdating.current) return;
      const html = ed.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    },
  });

  // Sync external content changes into the editor
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentHtml = editor.getHTML();
      const newHtml = markdownToHtml(content);
      if (currentHtml !== newHtml) {
        isUpdating.current = true;
        editor.commands.setContent(newHtml);
        isUpdating.current = false;
      }
    }
  }, [content, editor]);

  return (
    <div
      className="h-full overflow-auto bg-[#0f0f0f]"
      data-testid="visual-editor"
    >
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}

/** Export the editor instance hook for toolbar integration. */
export { useEditor as useTiptapEditor };
export { markdownToHtml, htmlToMarkdown };
