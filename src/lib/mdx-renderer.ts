/**
 * MDX Renderer — parses MDX content to HTML, extracts custom components,
 * builds docs navigation, and resolves pages from slugs.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentBlock {
  type: "markdown" | "component";
  tag?: string;
  content: string;
  props?: Record<string, string>;
}

export interface DocsNavItem {
  type: "item";
  label: string;
  path: string;
  pageId: string;
}

export interface DocsNavGroup {
  type: "group";
  label: string;
  items: DocsNavItem[];
}

export type DocsNavEntry = DocsNavItem | DocsNavGroup;

export interface PageData {
  id: string;
  path: string;
  title: string;
  content: string;
  isPublished: boolean;
}

// ── Markdown → HTML Renderer ──────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── SVG Icon Map ─────────────────────────────────────────────────────────────

const SVG_ICONS: Record<string, string> = {
  pencil:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  code: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  palette:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/></svg>',
  terminal:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
  book: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  rocket:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  settings:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  globe:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  compass:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  newspaper:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
  layout:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>',
  "file-text":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>',
  users:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  search:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  "edit-3":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
};

function renderSvgIcon(iconName: string): string {
  return SVG_ICONS[iconName] || "";
}

// ── Syntax Highlighting ──────────────────────────────────────────────────────

const SYNTAX_KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "class",
  "import",
  "export",
  "from",
  "default",
  "new",
  "this",
  "async",
  "await",
  "try",
  "catch",
  "throw",
  "typeof",
  "instanceof",
  "interface",
  "type",
  "enum",
  "extends",
  "implements",
  "public",
  "private",
  "protected",
  "static",
  "void",
  "int",
  "string",
  "number",
  "boolean",
  "null",
  "undefined",
  "true",
  "false",
  "def",
  "print",
  "self",
  "None",
  "True",
  "False",
  "package",
  "main",
  "func",
  "fmt",
  "struct",
]);

function applySyntaxHighlighting(code: string, lang: string): string {
  if (!lang) return code;

  let result = code;

  // Highlight single-line comments (// ...)
  result = result.replace(
    /(\/\/.*?)(\n|$)/g,
    '<span class="syntax-comment">$1</span>$2',
  );

  // Highlight # comments (Python, bash, etc.)
  if (
    lang === "python" ||
    lang === "bash" ||
    lang === "shell" ||
    lang === "ruby" ||
    lang === "yaml"
  ) {
    result = result.replace(
      /(#.*?)(\n|$)/g,
      '<span class="syntax-comment">$1</span>$2',
    );
  }

  // Highlight double-quoted strings (avoid replacing inside already-highlighted spans)
  result = result.replace(
    /&quot;((?:[^&]|&(?!quot;))*)&quot;/g,
    '<span class="syntax-string">&quot;$1&quot;</span>',
  );

  // Highlight single-quoted strings
  result = result.replace(
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    "<span class=\"syntax-string\">'$1'</span>",
  );

  // Highlight keywords — only in text nodes (not inside HTML tags)
  // Split result into HTML tags and text segments
  const parts = result.split(/(<[^>]+>)/g);
  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    // Skip HTML tags
    if (part.startsWith("<")) continue;
    let textPart = part;
    for (const kw of SYNTAX_KEYWORDS) {
      const regex = new RegExp(`(?<![\\w-])${kw}(?![\\w-])`, "g");
      textPart = textPart.replace(
        regex,
        `<span class="syntax-keyword">${kw}</span>`,
      );
    }
    parts[idx] = textPart;
  }
  result = parts.join("");

  return result;
}

/** Convert inline markdown (bold, italic, code, links, images) to HTML. */
function renderInline(text: string): string {
  let result = text;

  // Images first (before links since they share similar syntax)
  result = result.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" />',
  );

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Inline code (before bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold + italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");

  return result;
}

/**
 * Parse markdown content to HTML.
 * Handles headings, paragraphs, lists, code blocks, blockquotes,
 * horizontal rules, tables, and inline formatting.
 */
export function parseMdxToHtml(content: string): string {
  if (!content.trim()) return "";

  const lines = content.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (fenced)
    if (line.startsWith("```")) {
      const rawMeta = line.slice(3).trim();
      // Parse "lang filename" or just "lang"
      const metaParts = rawMeta.split(/\s+/);
      const lang = metaParts[0] || "";
      const filename = metaParts.slice(1).join(" ") || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const rawCode = escapeHtml(codeLines.join("\n"));
      const highlightedCode = lang
        ? applySyntaxHighlighting(rawCode, lang)
        : rawCode;
      const langAttr = lang ? ` data-language="${escapeHtml(lang)}"` : "";
      const displayName = filename || lang;
      const headerHtml = displayName
        ? `<div class="code-header"><span class="code-lang">${escapeHtml(displayName)}</span><div class="code-actions"><button class="code-copy" title="Copy">Copy</button><button class="code-ask-ai" title="Ask AI">Ask AI</button></div></div>`
        : "";
      output.push(
        `<div class="code-block"${langAttr}>${headerHtml}<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${highlightedCode}</code></pre></div>`,
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      output.push(
        `<h${level} id="${id}"><a href="#${id}" class="heading-anchor">${renderInline(text)}</a></h${level}>`,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      output.push("<hr />");
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      output.push(
        `<blockquote>${renderInline(quoteLines.join("\n"))}</blockquote>`,
      );
      continue;
    }

    // Table (GFM)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\|?\s*[-:]+[-| :]*$/.test(lines[i + 1])
    ) {
      const parseRow = (row: string): string[] =>
        row
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c !== "");
      const headers = parseRow(line);
      i += 2; // skip header + separator

      let tableHtml = "<table><thead><tr>";
      for (const h of headers) {
        tableHtml += `<th>${renderInline(h)}</th>`;
      }
      tableHtml += "</tr></thead><tbody>";

      while (i < lines.length && lines[i].includes("|")) {
        const cells = parseRow(lines[i]);
        tableHtml += "<tr>";
        for (const c of cells) {
          tableHtml += `<td>${renderInline(c)}</td>`;
        }
        tableHtml += "</tr>";
        i++;
      }

      tableHtml += "</tbody></table>";
      output.push(tableHtml);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*+]\s+/, ""));
        i++;
      }
      const items = listItems
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("");
      output.push(`<ul>${items}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      const items = listItems
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("");
      output.push(`<ol>${items}</ol>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — collect contiguous non-empty lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("> ") &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      output.push(`<p>${renderInline(paraLines.join("\n"))}</p>`);
    }
  }

  return output.join("\n");
}

// ── Component Block Extraction ────────────────────────────────────────────────

/** Known top-level custom components that can appear in MDX content. */
const KNOWN_COMPONENTS = new Set([
  "Note",
  "Warning",
  "Tip",
  "Info",
  "Check",
  "Card",
  "CardGroup",
  "Steps",
  "Step",
  "Tabs",
  "Tab",
  "Accordion",
  "AccordionGroup",
  "CodeGroup",
  "Frame",
  "Columns",
  "Column",
  "Dropdown",
  "ApiPlayground",
]);

/** Known wrapper components that contain other components. */
const WRAPPER_COMPONENTS = new Set([
  "CardGroup",
  "Steps",
  "Tabs",
  "AccordionGroup",
  "CodeGroup",
  "Columns",
]);

/** Parse JSX-like props from an opening tag string. */
function parseProps(tagStr: string): Record<string, string> {
  const props: Record<string, string> = {};
  // Match attribute="value" or attribute='value' or attribute={value}
  const attrRegex = /(\w+)=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;
  let match: RegExpExecArray | null = attrRegex.exec(tagStr);
  while (match) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    props[key] = value;
    match = attrRegex.exec(tagStr);
  }
  return props;
}

/**
 * Extract MDX component blocks from content, splitting into markdown and component segments.
 * Handles nested components (e.g., CardGroup > Card).
 */
export function extractComponentBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.split("\n");
  let i = 0;
  let markdownBuffer: string[] = [];

  function flushMarkdown() {
    const text = markdownBuffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "markdown", content: text });
    }
    markdownBuffer = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // Self-closing component: <Frame caption="Screenshot" />
    const selfClosingMatch = line.match(/^<(\w+)([^>]*)\s*\/>\s*$/);
    if (selfClosingMatch && KNOWN_COMPONENTS.has(selfClosingMatch[1])) {
      flushMarkdown();
      const tag = selfClosingMatch[1];
      const props = parseProps(selfClosingMatch[2] || "");
      blocks.push({ type: "component", tag, content: "", props });
      i++;
      continue;
    }

    // Opening tag of a known component
    const openMatch = line.match(/^<(\w+)([^>]*)>\s*$/);
    if (openMatch && KNOWN_COMPONENTS.has(openMatch[1])) {
      flushMarkdown();
      const tag = openMatch[1];
      const props = parseProps(openMatch[2] || "");
      const isWrapper = WRAPPER_COMPONENTS.has(tag);

      // Find the matching closing tag
      const closingTag = `</${tag}>`;
      const contentLines: string[] = [];
      let depth = 1;
      i++;

      while (i < lines.length && depth > 0) {
        const currentLine = lines[i];
        // Check for nested same-tag opens
        if (
          new RegExp(`^<${tag}[\\s>]`).test(currentLine) &&
          !currentLine.includes("/>")
        ) {
          depth++;
        }
        if (currentLine.trim() === closingTag) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        contentLines.push(currentLine);
        i++;
      }

      blocks.push({
        type: "component",
        tag,
        content: contentLines.join("\n").trim(),
        props,
      });
      continue;
    }

    // Regular markdown line
    markdownBuffer.push(line);
    i++;
  }

  flushMarkdown();
  return blocks;
}

// ── Component Block Rendering ─────────────────────────────────────────────────

/** Render a single component block to HTML. */
export function renderComponentBlock(block: ContentBlock): string {
  if (block.type === "markdown") {
    return parseMdxToHtml(block.content);
  }

  const tag = block.tag || "";
  const content = block.content;
  const props = block.props || {};

  switch (tag) {
    // Callouts
    case "Note":
    case "Info": {
      const noteTitle = props.title || "";
      const titleHtml = noteTitle
        ? `<div class="callout-title">${escapeHtml(noteTitle)}</div>`
        : "";
      return `<div class="callout callout-note"><div class="callout-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div><div class="callout-content">${titleHtml}${parseMdxToHtml(content)}</div></div>`;
    }

    case "Warning": {
      const warnTitle = props.title || "";
      const warnTitleHtml = warnTitle
        ? `<div class="callout-title">${escapeHtml(warnTitle)}</div>`
        : "";
      return `<div class="callout callout-warning"><div class="callout-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div><div class="callout-content">${warnTitleHtml}${parseMdxToHtml(content)}</div></div>`;
    }

    case "Tip":
    case "Check": {
      const tipTitle = props.title || "";
      const tipTitleHtml = tipTitle
        ? `<div class="callout-title">${escapeHtml(tipTitle)}</div>`
        : "";
      return `<div class="callout callout-tip"><div class="callout-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="callout-content">${tipTitleHtml}${parseMdxToHtml(content)}</div></div>`;
    }

    // Card
    case "Card": {
      const title = props.title || "";
      const href = props.href || "";
      const icon = props.icon || "";
      const svgIcon = icon ? renderSvgIcon(icon) : "";
      const iconHtml = icon
        ? `<div class="card-icon">${svgIcon || escapeHtml(icon)}</div>`
        : "";
      const inner = `<div class="card-content">${iconHtml}<h3 class="card-title">${escapeHtml(title)}</h3><div class="card-body">${parseMdxToHtml(content)}</div></div>`;
      if (href) {
        return `<a href="${escapeHtml(href)}" class="card card-link">${inner}</a>`;
      }
      return `<div class="card">${inner}</div>`;
    }

    // CardGroup
    case "CardGroup": {
      const cols = props.cols || "2";
      // Extract nested Cards
      const nestedBlocks = extractComponentBlocks(content);
      const cardsHtml = nestedBlocks
        .map((b) => renderComponentBlock(b))
        .join("");
      return `<div class="card-group" style="grid-template-columns: repeat(${escapeHtml(cols)}, 1fr)">${cardsHtml}</div>`;
    }

    // Steps
    case "Steps": {
      const stepRegex =
        /<Step\s+title="([^"]*)"[^>]*>\s*([\s\S]*?)(?=<Step\s|$)/g;
      const steps: Array<{ title: string; content: string }> = [];
      let stepMatch = stepRegex.exec(content);
      while (stepMatch) {
        // Clean up trailing </Step> from content
        const stepContent = stepMatch[2].replace(/<\/Step>/g, "").trim();
        steps.push({ title: stepMatch[1], content: stepContent });
        stepMatch = stepRegex.exec(content);
      }

      if (steps.length === 0) {
        return `<div class="steps">${parseMdxToHtml(content)}</div>`;
      }

      const stepsHtml = steps
        .map(
          (step, idx) =>
            `<div class="step"><div class="step-number">${idx + 1}</div><div class="step-content"><h3 class="step-title">${escapeHtml(step.title)}</h3><div class="step-body">${parseMdxToHtml(step.content)}</div></div></div>`,
        )
        .join("");
      return `<div class="steps">${stepsHtml}</div>`;
    }

    // Tabs
    case "Tabs": {
      const tabRegex = /<Tab\s+title="([^"]*)"[^>]*>\s*([\s\S]*?)(?=<Tab\s|$)/g;
      const tabs: Array<{ title: string; content: string }> = [];
      let tabMatch = tabRegex.exec(content);
      while (tabMatch) {
        const tabContent = tabMatch[2].replace(/<\/Tab>/g, "").trim();
        tabs.push({ title: tabMatch[1], content: tabContent });
        tabMatch = tabRegex.exec(content);
      }

      if (tabs.length === 0) {
        return `<div class="tabs">${parseMdxToHtml(content)}</div>`;
      }

      const tabHeaders = tabs
        .map(
          (tab, idx) =>
            `<button class="tab-button${idx === 0 ? " active" : ""}" data-tab="${idx}">${escapeHtml(tab.title)}</button>`,
        )
        .join("");
      const tabPanels = tabs
        .map(
          (tab, idx) =>
            `<div class="tab-panel${idx === 0 ? " active" : ""}" data-tab="${idx}">${parseMdxToHtml(tab.content)}</div>`,
        )
        .join("");
      return `<div class="tabs"><div class="tab-bar">${tabHeaders}</div><div class="tab-panels">${tabPanels}</div></div>`;
    }

    // Accordion
    case "Accordion": {
      const title = props.title || "Details";
      return `<details class="accordion"><summary class="accordion-summary">${escapeHtml(title)}</summary><div class="accordion-content">${parseMdxToHtml(content)}</div></details>`;
    }

    // AccordionGroup
    case "AccordionGroup": {
      const nestedBlocks = extractComponentBlocks(content);
      const accordionsHtml = nestedBlocks
        .map((b) => renderComponentBlock(b))
        .join("");
      return `<div class="accordion-group">${accordionsHtml}</div>`;
    }

    // CodeGroup — tabbed code blocks
    case "CodeGroup": {
      const codeBlockRegex = /```(\w+)\s*\n([\s\S]*?)```/g;
      const codeBlocks: Array<{ lang: string; code: string }> = [];
      let codeMatch = codeBlockRegex.exec(content);
      while (codeMatch) {
        codeBlocks.push({ lang: codeMatch[1], code: codeMatch[2].trim() });
        codeMatch = codeBlockRegex.exec(content);
      }

      if (codeBlocks.length === 0) {
        return `<div class="code-group">${parseMdxToHtml(content)}</div>`;
      }

      const codeHeaders = codeBlocks
        .map(
          (cb, idx) =>
            `<button class="tab-button${idx === 0 ? " active" : ""}" data-tab="${idx}">${escapeHtml(cb.lang)}</button>`,
        )
        .join("");
      const codePanels = codeBlocks
        .map(
          (cb, idx) =>
            `<div class="tab-panel${idx === 0 ? " active" : ""}" data-tab="${idx}"><div class="code-panel-actions"><button class="code-copy" title="Copy">Copy</button></div><pre><code class="language-${escapeHtml(cb.lang)}">${applySyntaxHighlighting(escapeHtml(cb.code), cb.lang)}</code></pre></div>`,
        )
        .join("");
      return `<div class="code-group"><div class="tab-bar">${codeHeaders}</div><div class="tab-panels">${codePanels}</div></div>`;
    }

    // Frame
    case "Frame": {
      const caption = props.caption || "";
      return `<figure class="frame">${parseMdxToHtml(content)}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
    }

    // Columns
    case "Columns": {
      const cols = props.cols || "2";
      const nestedBlocks = extractComponentBlocks(content);
      const colsHtml = nestedBlocks
        .map((b) => renderComponentBlock(b))
        .join("");
      return `<div class="columns" style="grid-template-columns: repeat(${escapeHtml(cols)}, 1fr)">${colsHtml}</div>`;
    }

    case "Column":
      return `<div class="column">${parseMdxToHtml(content)}</div>`;

    case "Dropdown": {
      const title = props.title || "Details";
      return `<details class="accordion"><summary class="accordion-summary">${escapeHtml(title)}</summary><div class="accordion-content">${parseMdxToHtml(content)}</div></details>`;
    }

    // ApiPlayground — rendered as a marker div; the actual playground HTML
    // is injected by the page component using the OpenAPI spec.
    case "ApiPlayground": {
      const method = props.method || "GET";
      const path = props.path || props.endpoint || "";
      return `<div class="api-playground-marker" data-method="${escapeHtml(method)}" data-path="${escapeHtml(path)}"></div>`;
    }

    default:
      return parseMdxToHtml(content);
  }
}

/**
 * Render full MDX content (markdown + components) to HTML.
 * First extracts component blocks, then renders each segment.
 */
export function renderMdxContent(content: string): string {
  const blocks = extractComponentBlocks(content);
  return blocks.map((block) => renderComponentBlock(block)).join("\n");
}

// ── Docs Navigation Builder ───────────────────────────────────────────────────

/**
 * Build a navigation structure from a flat list of pages.
 * Groups pages by their first path segment.
 * Root-level pages become items; pages with path segments become groups.
 */
export function buildDocsNav(
  pageList: Array<{ id: string; path: string; title: string }>,
): DocsNavEntry[] {
  if (pageList.length === 0) return [];

  const rootItems: DocsNavItem[] = [];
  const groups = new Map<string, DocsNavItem[]>();

  for (const page of pageList) {
    const segments = page.path.split("/");

    if (segments.length === 1) {
      rootItems.push({
        type: "item",
        label: page.title,
        path: page.path,
        pageId: page.id,
      });
    } else {
      const groupName = segments[0];
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      const groupItems = groups.get(groupName);
      if (groupItems) {
        groupItems.push({
          type: "item",
          label: page.title,
          path: page.path,
          pageId: page.id,
        });
      }
    }
  }

  const nav: DocsNavEntry[] = [];

  // Root items first
  for (const item of rootItems) {
    nav.push(item);
  }

  // Then groups
  for (const [groupName, items] of groups) {
    const label =
      groupName.charAt(0).toUpperCase() + groupName.slice(1).replace(/-/g, " ");
    nav.push({
      type: "group",
      label,
      items: items.sort((a, b) => a.path.localeCompare(b.path)),
    });
  }

  return nav;
}

// ── Page Resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve a page from slug segments against a list of pages.
 * By default only returns published pages.
 */
export function resolvePageFromSlug(
  slugSegments: string[],
  pageList: PageData[],
  includeUnpublished = false,
): PageData | undefined {
  if (slugSegments.length === 0) return undefined;
  const targetPath = slugSegments.join("/").toLowerCase();
  return pageList.find(
    (p) => p.path === targetPath && (includeUnpublished || p.isPublished),
  );
}
