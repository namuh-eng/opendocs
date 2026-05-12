"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface VisualEditorProps {
  content: string;
  onChange: (markdown: string) => void;
}

export interface VisualEditorHandle {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleHeading: () => void;
  insertLink: () => void;
  insertImage: () => void;
  insertCodeBlock: () => void;
}

const MDX_PREVIEW_TAG = "mdx-preview";
const MARKDOWN_TABLE_TAG = "markdown-table-preview";

const MdxPreviewNode = Node.create({
  name: "mdxPreview",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      kind: {
        default: "MDX",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-kind") ?? "MDX",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-kind": attributes.kind,
        }),
      },
      label: {
        default: "MDX component",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-label") ?? "MDX component",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-label": attributes.label,
        }),
      },
      summary: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-summary") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-summary": attributes.summary,
        }),
      },
      source: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-source") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-source": attributes.source,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: MDX_PREVIEW_TAG }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [MDX_PREVIEW_TAG, mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }: { node: { attrs: Record<string, string> } }) => {
      const dom = document.createElement("div");
      dom.className =
        "not-prose my-4 rounded-xl border border-[var(--od-code-border)] bg-[var(--od-code-bg)] p-4";
      dom.contentEditable = "false";
      dom.dataset.kind = node.attrs.kind;
      dom.dataset.source = node.attrs.source;

      const header = document.createElement("div");
      header.className =
        "mb-2 inline-flex items-center rounded-full border border-[var(--od-accent-border)] bg-[var(--od-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--od-accent-text)]";
      header.textContent = node.attrs.label;

      const summary = document.createElement("p");
      summary.className = "m-0 text-sm text-[var(--od-editor-text)]";
      summary.textContent = node.attrs.summary || `${node.attrs.label} preview`;

      dom.append(header, summary);
      return { dom };
    };
  },
});

const MarkdownTablePreviewNode = Node.create({
  name: "markdownTablePreview",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      source: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-source") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-source": attributes.source,
        }),
      },
      html: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-html") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-html": attributes.html,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: MARKDOWN_TABLE_TAG }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [MARKDOWN_TABLE_TAG, mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }: { node: { attrs: Record<string, string> } }) => {
      const dom = document.createElement("div");
      dom.className = "editor-markdown-table-preview";
      dom.contentEditable = "false";
      dom.dataset.source = node.attrs.source;
      dom.dataset.html = node.attrs.html;
      dom.innerHTML = decodeSource(node.attrs.html);
      return { dom };
    };
  },
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeSource(value: string): string {
  return encodeURIComponent(value);
}

function decodeSource(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagAttribute(source: string, attr: string): string | null {
  const match = source.match(new RegExp(`${attr}="([^"]+)"`, "i"));
  return match?.[1] ?? null;
}

function createMdxPreviewTag(
  kind: string,
  label: string,
  summary: string,
  source: string,
): string {
  return `<${MDX_PREVIEW_TAG} data-kind="${escapeHtml(kind)}" data-label="${escapeHtml(label)}" data-summary="${escapeHtml(summary)}" data-source="${escapeHtml(encodeSource(source))}"></${MDX_PREVIEW_TAG}>`;
}

function replaceMdxBlocks(md: string): string {
  const replacements: Array<[RegExp, (source: string) => string]> = [
    [
      /<Note\b[^>]*>([\s\S]*?)<\/Note>/gi,
      (source) =>
        createMdxPreviewTag("Note", "Note", stripTags(source), source),
    ],
    [
      /<Card\b[^>]*>([\s\S]*?)<\/Card>/gi,
      (source) => {
        const title = getTagAttribute(source, "title") ?? "Card";
        return createMdxPreviewTag("Card", "Card", title, source);
      },
    ],
    [
      /<Tab\b[^>]*>([\s\S]*?)<\/Tab>/gi,
      (source) => {
        const title = getTagAttribute(source, "title") ?? "Tab";
        return createMdxPreviewTag("Tab", "Tab", title, source);
      },
    ],
    [
      /<Dropdown\b[^>]*>([\s\S]*?)<\/Dropdown>/gi,
      (source) => {
        const title = getTagAttribute(source, "title") ?? "Dropdown";
        return createMdxPreviewTag("Dropdown", "Dropdown", title, source);
      },
    ],
    [
      /<Columns\b[^>]*>([\s\S]*?)<\/Columns>/gi,
      (source) => {
        const columnCount = (source.match(/<Column\b/gi) ?? []).length || 2;
        return createMdxPreviewTag(
          "Columns",
          "Columns",
          `${columnCount} column layout`,
          source,
        );
      },
    ],
    [
      /<Anchor\b[^>]*\/>/gi,
      (source) => {
        const id = getTagAttribute(source, "id") ?? "anchor-id";
        return createMdxPreviewTag("Anchor", "Anchor", `#${id}`, source);
      },
    ],
    [
      /<Language\b[^>]*\/>/gi,
      (source) => {
        const code = getTagAttribute(source, "code") ?? "typescript";
        return createMdxPreviewTag(
          "Language",
          "Language",
          code.toUpperCase(),
          source,
        );
      },
    ],
    [
      /<Product\b[^>]*\/>/gi,
      (source) => {
        const name = getTagAttribute(source, "name") ?? "Product";
        return createMdxPreviewTag("Product", "Product", name, source);
      },
    ],
    [
      /<Version\b[^>]*\/>/gi,
      (source) => {
        const tag = getTagAttribute(source, "tag") ?? "v1";
        return createMdxPreviewTag("Version", "Version", tag, source);
      },
    ],
  ];

  return replacements.reduce(
    (current, [pattern, replacer]) => current.replace(pattern, replacer),
    md,
  );
}

function createMarkdownTablePreviewTag(source: string): string {
  const rows = source
    .trim()
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
  const [header = [], _separator = [], ...body] = rows;
  const tableHtml = `<table><thead><tr>${header
    .map((cell) => `<th>${processInlineMarkdown(cell)}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${processInlineMarkdown(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</tbody></table>`;

  return `<${MARKDOWN_TABLE_TAG} data-source="${escapeHtml(
    encodeSource(source),
  )}" data-html="${escapeHtml(encodeSource(tableHtml))}"></${MARKDOWN_TABLE_TAG}>`;
}

function tokenizeBlocks(
  value: string,
  pattern: RegExp,
  replacer: (match: string, ...groups: string[]) => string,
): { text: string; restore: (text: string) => string } {
  const blocks: string[] = [];
  const text = value.replace(pattern, (match, ...groups: string[]) => {
    const token = `\u0000BLOCK_${blocks.length}\u0000`;
    blocks.push(replacer(match, ...groups));
    return token;
  });
  return {
    text,
    restore: (current) =>
      blocks.reduce(
        (result, block, index) =>
          result.replace(`\u0000BLOCK_${index}\u0000`, block),
        current,
      ),
  };
}

function isMarkdownTableStart(lines: string[], index: number): boolean {
  const header = lines[index]?.trim() ?? "";
  const separator = lines[index + 1]?.trim() ?? "";
  return (
    header.startsWith("|") &&
    header.endsWith("|") &&
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator)
  );
}

function replaceMarkdownTables(value: string): string {
  const lines = value.split("\n");
  const output: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (!isMarkdownTableStart(lines, index)) {
      output.push(lines[index]);
      continue;
    }

    const tableLines = [lines[index], lines[index + 1]];
    index += 2;
    while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index] ?? "")) {
      tableLines.push(lines[index]);
      index += 1;
    }
    index -= 1;
    output.push(createMarkdownTablePreviewTag(tableLines.join("\n")));
  }

  return output.join("\n");
}

function processInlineMarkdown(value: string): string {
  let html = escapeHtml(value);
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(
    /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g,
    '<a href="$3"><img src="$2" alt="$1" /></a>',
  );
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

/** Convert simple markdown to HTML for Tiptap. */
function markdownToHtml(md: string): string {
  const fencedBlocks = tokenizeBlocks(
    replaceMdxBlocks(md),
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre><code>${escapeHtml(code.trim())}</code></pre>`,
  );

  let html = replaceMarkdownTables(fencedBlocks.text);
  html = html.replace(
    /^######\s+(.+)$/gm,
    (_match, text) => `<h6>${processInlineMarkdown(text)}</h6>`,
  );
  html = html.replace(
    /^#####\s+(.+)$/gm,
    (_match, text) => `<h5>${processInlineMarkdown(text)}</h5>`,
  );
  html = html.replace(
    /^####\s+(.+)$/gm,
    (_match, text) => `<h4>${processInlineMarkdown(text)}</h4>`,
  );
  html = html.replace(
    /^###\s+(.+)$/gm,
    (_match, text) => `<h3>${processInlineMarkdown(text)}</h3>`,
  );
  html = html.replace(
    /^##\s+(.+)$/gm,
    (_match, text) => `<h2>${processInlineMarkdown(text)}</h2>`,
  );
  html = html.replace(
    /^#\s+(.+)$/gm,
    (_match, text) => `<h1>${processInlineMarkdown(text)}</h1>`,
  );
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(
    /^>\s?(.+(?:\n>\s?.+)*)$/gm,
    (match) =>
      `<blockquote>${match
        .split("\n")
        .map((line) => processInlineMarkdown(line.replace(/^>\s?/, "")))
        .join("<br>")}</blockquote>`,
  );

  html = html
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      if (/^<\/?(h[1-6]|hr|pre|blockquote|img|ul|ol|li|a)/.test(line)) {
        return line;
      }
      if (
        line.startsWith(`<${MDX_PREVIEW_TAG}`) ||
        line.startsWith(`<${MARKDOWN_TABLE_TAG}`) ||
        line.startsWith("\u0000BLOCK_")
      ) {
        return line;
      }
      return `<p>${processInlineMarkdown(line)}</p>`;
    })
    .join("\n");

  return fencedBlocks.restore(html);
}

/** Convert Tiptap HTML back to markdown. */
function htmlToMarkdown(html: string): string {
  let md = html;
  const previewSources = new Map<string, string>();
  let previewIndex = 0;

  md = md.replace(
    new RegExp(
      `<${MDX_PREVIEW_TAG}[^>]*data-source="([^"]+)"[^>]*><\\/${MDX_PREVIEW_TAG}>`,
      "gi",
    ),
    (_match, source) => {
      const token = `__MDX_PREVIEW_${previewIndex}__`;
      previewSources.set(token, decodeSource(source));
      previewIndex += 1;
      return `\n\n${token}\n\n`;
    },
  );

  md = md.replace(
    new RegExp(
      `<${MARKDOWN_TABLE_TAG}[^>]*data-source="([^"]+)"[^>]*><\\/${MARKDOWN_TABLE_TAG}>`,
      "gi",
    ),
    (_match, source) => {
      const token = `__MDX_PREVIEW_${previewIndex}__`;
      previewSources.set(token, decodeSource(source));
      previewIndex += 1;
      return `\n\n${token}\n\n`;
    },
  );

  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");

  md = md.replace(/<strong><em>(.*?)<\/em><\/strong>/gi, "***$1***");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");

  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");
  md = md.replace(
    /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    "```\n$1\n```\n\n",
  );

  md = md.replace(
    /<a[^>]*href="([^"]*)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>(?:<\/img>)?\s*<\/a>/gi,
    "[![$3]($2)]($1)",
  );
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(
    /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    "![$2]($1)\n\n",
  );
  md = md.replace(
    /<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*\/?>/gi,
    "![$1]($2)\n\n",
  );

  md = md.replace(/<hr\s*\/?>/gi, "---\n\n");
  md = md.replace(/<p>([\s\S]*?)<\/p>/gi, (_match, paragraph) => {
    const normalizedParagraph = String(paragraph).trim();
    return normalizedParagraph ? `${normalizedParagraph}\n\n` : "";
  });
  md = md.replace(/<li>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[uo]l>/gi, "");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<[^>]+>/g, "");

  md = md
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  md = md.replace(/\n{3,}/g, "\n\n");

  for (const [token, source] of previewSources) {
    md = md.replace(token, source);
  }

  return md.trim();
}

function insertPlaceholderParagraph(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  mark: "bold" | "italic",
  text: string,
) {
  editor
    .chain()
    .focus()
    .unsetAllMarks()
    .insertContent([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text,
            marks: [{ type: mark }],
          },
        ],
      },
      {
        type: "paragraph",
      },
    ])
    .focus("end")
    .run();
}

function insertPlaceholderHeading(
  editor: NonNullable<ReturnType<typeof useEditor>>,
) {
  editor
    .chain()
    .focus()
    .unsetAllMarks()
    .insertContent([
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Heading" }],
      },
      {
        type: "paragraph",
      },
    ])
    .focus("end")
    .run();
}

export const VisualEditor = forwardRef<VisualEditorHandle, VisualEditorProps>(
  function VisualEditor({ content, onChange }, ref) {
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
              "bg-[var(--od-code-bg)] border border-[var(--od-code-border)] rounded-lg p-4 font-mono text-sm text-[var(--od-code-text)] my-4",
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class:
              "my-4 rounded-lg border border-[var(--od-code-border)] max-w-full",
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class:
              "text-[var(--od-accent)] underline hover:text-[var(--od-accent-strong)]",
          },
        }),
        Underline,
        MdxPreviewNode,
        MarkdownTablePreviewNode,
        Placeholder.configure({
          placeholder: "Start writing your documentation...",
        }),
      ],
      content: markdownToHtml(content),
      editorProps: {
        attributes: {
          class:
            "editor-prose mx-auto min-h-full w-full max-w-3xl px-8 py-10 focus:outline-none lg:px-12",
        },
      },
      onUpdate: ({
        editor: currentEditor,
      }: { editor: { getHTML: () => string } }) => {
        if (isUpdating.current) return;
        onChange(htmlToMarkdown(currentEditor.getHTML()));
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        toggleBold: () => {
          if (!editor) return;
          if (editor.state.selection.empty) {
            insertPlaceholderParagraph(editor, "bold", "Bold text");
            return;
          }
          editor?.chain().focus().toggleBold().run();
        },
        toggleItalic: () => {
          if (!editor) return;
          if (editor.state.selection.empty) {
            insertPlaceholderParagraph(editor, "italic", "Italic text");
            return;
          }
          editor?.chain().focus().toggleItalic().run();
        },
        toggleHeading: () => {
          if (!editor) return;
          if (editor.state.selection.empty) {
            insertPlaceholderHeading(editor);
            return;
          }
          editor?.chain().focus().toggleHeading({ level: 2 }).run();
        },
        insertLink: () => {
          if (!editor) return;

          const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            " ",
          );

          if (selectedText.length === 0) {
            editor
              .chain()
              .focus()
              .insertContent('<a href="https://example.com">Link text</a>')
              .run();
            return;
          }

          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: "https://example.com" })
            .run();
        },
        insertImage: () => {
          editor
            ?.chain()
            .focus()
            .setImage({
              src: "https://placehold.co/1200x630/png",
              alt: "Editor image",
            })
            .run();
        },
        insertCodeBlock: () => {
          editor
            ?.chain()
            .focus()
            .setCodeBlock()
            .insertContent("// code here")
            .run();
        },
      }),
      [editor],
    );

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
        className="h-full overflow-auto bg-[var(--od-editor-bg)]"
        data-testid="visual-editor"
      >
        <EditorContent editor={editor} className="h-full" />
      </div>
    );
  },
);

export { useEditor as useTiptapEditor };
export { htmlToMarkdown, markdownToHtml };
