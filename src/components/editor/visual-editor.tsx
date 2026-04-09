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
        parseHTML: (element) => element.getAttribute("data-kind") ?? "MDX",
        renderHTML: (attributes) => ({ "data-kind": attributes.kind }),
      },
      label: {
        default: "MDX component",
        parseHTML: (element) =>
          element.getAttribute("data-label") ?? "MDX component",
        renderHTML: (attributes) => ({ "data-label": attributes.label }),
      },
      summary: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-summary") ?? "",
        renderHTML: (attributes) => ({ "data-summary": attributes.summary }),
      },
      source: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source") ?? "",
        renderHTML: (attributes) => ({ "data-source": attributes.source }),
      },
    };
  },

  parseHTML() {
    return [{ tag: MDX_PREVIEW_TAG }];
  },

  renderHTML({ HTMLAttributes }) {
    return [MDX_PREVIEW_TAG, mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className =
        "not-prose my-4 rounded-xl border border-white/[0.08] bg-[#161616] p-4";
      dom.contentEditable = "false";
      dom.dataset.kind = node.attrs.kind;
      dom.dataset.source = node.attrs.source;

      const header = document.createElement("div");
      header.className =
        "mb-2 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300";
      header.textContent = node.attrs.label;

      const summary = document.createElement("p");
      summary.className = "m-0 text-sm text-gray-300";
      summary.textContent = node.attrs.summary || `${node.attrs.label} preview`;

      dom.append(header, summary);
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

/** Convert simple markdown to HTML for Tiptap. */
function markdownToHtml(md: string): string {
  let html = replaceMdxBlocks(md);

  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) => `<pre><code>${code.trim()}</code></pre>`,
  );

  const lines = html.split("\n");
  const result: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (
      line.startsWith("<h") ||
      line.startsWith("<hr") ||
      line.startsWith("<pre") ||
      line.startsWith(`<${MDX_PREVIEW_TAG}`) ||
      line.startsWith("<img") ||
      line.startsWith("<ul") ||
      line.startsWith("<ol")
    ) {
      inBlock = true;
      result.push(line);
      if (
        line.includes("</pre>") ||
        line.includes(`</${MDX_PREVIEW_TAG}>`) ||
        line.includes("</ul>") ||
        line.includes("</ol>")
      ) {
        inBlock = false;
      }
    } else if (inBlock) {
      result.push(line);
      if (
        line.includes("</pre>") ||
        line.includes(`</${MDX_PREVIEW_TAG}>`) ||
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
      return token;
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
  md = md.replace(/<p>(.*?)<\/p>/gi, "$1\n\n");
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
              "bg-[#1a1a1a] rounded-lg p-4 font-mono text-sm text-emerald-300 my-4",
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: "my-4 rounded-lg border border-white/[0.08] max-w-full",
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-emerald-400 underline hover:text-emerald-300",
          },
        }),
        Underline,
        MdxPreviewNode,
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
      onUpdate: ({ editor: currentEditor }) => {
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
            editor
              .chain()
              .focus()
              .insertContent("<strong>Bold text</strong>")
              .run();
            return;
          }
          editor?.chain().focus().toggleBold().run();
        },
        toggleItalic: () => {
          if (!editor) return;
          if (editor.state.selection.empty) {
            editor.chain().focus().insertContent("<em>Italic text</em>").run();
            return;
          }
          editor?.chain().focus().toggleItalic().run();
        },
        toggleHeading: () => {
          if (!editor) return;
          if (editor.state.selection.empty) {
            editor.chain().focus().insertContent("<h2>Heading</h2>").run();
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
        className="h-full overflow-auto bg-[#0f0f0f]"
        data-testid="visual-editor"
      >
        <EditorContent editor={editor} className="h-full" />
      </div>
    );
  },
);

export { useEditor as useTiptapEditor };
export { htmlToMarkdown, markdownToHtml };
