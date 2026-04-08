/**
 * Editor utilities — mode management, auto-save, MDX helpers.
 */

/** Editor modes */
export type EditorMode = "visual" | "markdown";

/** Extract frontmatter from MDX content string. */
export function extractFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = trimmed.indexOf("---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const fmBlock = trimmed.slice(3, endIndex).trim();
  const frontmatter: Record<string, string> = {};

  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) frontmatter[key] = value;
  }

  const body = trimmed.slice(endIndex + 3).trimStart();
  return { frontmatter, body };
}

/** Serialize frontmatter back to string with body. */
export function serializeFrontmatter(
  frontmatter: Record<string, string>,
  body: string,
): string {
  const entries = Object.entries(frontmatter).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (entries.length === 0) return body;

  const fmLines = entries.map(([k, v]) => {
    // Quote values that contain special chars
    if (v.includes(":") || v.includes("#") || v.includes('"')) {
      return `${k}: "${v.replace(/"/g, '\\"')}"`;
    }
    return `${k}: ${v}`;
  });

  return `---\n${fmLines.join("\n")}\n---\n\n${body}`;
}

/** Count lines in a string. */
export function countLines(text: string): number {
  if (!text) return 1;
  return text.split("\n").length;
}

/** Generate line numbers array for display. */
export function generateLineNumbers(text: string): number[] {
  const count = countLines(text);
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** Extract headings from MDX body for table of contents. */
export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

export function extractToc(body: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = body.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      entries.push({ level, text, id });
    }
  }

  return entries;
}

/** Debounce helper for auto-save. Returns a debounced function and a cancel method. */
export function createAutoSave(
  saveFn: (content: string) => Promise<void>,
  delayMs: number,
): {
  trigger: (content: string) => void;
  cancel: () => void;
  flush: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingContent: string | null = null;

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingContent = null;
  }

  function flush() {
    if (timer && pendingContent !== null) {
      clearTimeout(timer);
      timer = null;
      saveFn(pendingContent);
      pendingContent = null;
    }
  }

  function trigger(content: string) {
    pendingContent = content;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (pendingContent !== null) {
        saveFn(pendingContent);
        pendingContent = null;
      }
    }, delayMs);
  }

  return { trigger, cancel, flush };
}

/** MDX component snippets for the "Add new" dropdown. */
export const mdxSnippets = {
  tab: `<Tab title="Tab Title">\n  Content here\n</Tab>`,
  dropdown: `<Dropdown title="Dropdown Title">\n  Content here\n</Dropdown>`,
  anchor: `<Anchor id="anchor-id" />`,
  callout: "<Note>\n  Important information here\n</Note>",
  card: `<Card title="Card Title" icon="icon-name" href="/link">\n  Card description here\n</Card>`,
  codeBlock: "```language\n// code here\n```",
  columns:
    "<Columns cols={2}>\n  <Column>\n    Left content\n  </Column>\n  <Column>\n    Right content\n  </Column>\n</Columns>",
} as const;

export type MdxSnippetKey = keyof typeof mdxSnippets;

/** Insert a snippet at a cursor position in text. */
export function insertSnippetAtCursor(
  text: string,
  cursorPos: number,
  snippet: string,
): { newText: string; newCursorPos: number } {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);

  // Add newlines around snippet if needed
  const needNewlineBefore = before.length > 0 && !before.endsWith("\n");
  const needNewlineAfter = after.length > 0 && !after.startsWith("\n");

  const prefix = needNewlineBefore ? "\n" : "";
  const suffix = needNewlineAfter ? "\n" : "";

  const newText = before + prefix + snippet + suffix + after;
  const newCursorPos = before.length + prefix.length + snippet.length;

  return { newText, newCursorPos };
}
