import {
  htmlToMarkdown,
  markdownToHtml,
} from "@/components/editor/visual-editor";
import {
  countLines,
  createAutoSave,
  extractFrontmatter,
  extractToc,
  generateLineNumbers,
  insertSnippetAtCursor,
  mdxSnippets,
  serializeFrontmatter,
} from "@/lib/editor";
import { describe, expect, it, vi } from "vitest";

describe("extractFrontmatter", () => {
  it("extracts valid frontmatter from MDX content", () => {
    const content = `---
title: Introduction
description: Welcome to docs
---

# Hello World`;

    const result = extractFrontmatter(content);
    expect(result.frontmatter).toEqual({
      title: "Introduction",
      description: "Welcome to docs",
    });
    expect(result.body).toBe("# Hello World");
  });

  it("returns empty frontmatter when none present", () => {
    const content = "# Hello World\n\nSome content";
    const result = extractFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(content);
  });

  it("handles unclosed frontmatter block", () => {
    const content = "---\ntitle: Test\nSome content";
    const result = extractFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(content);
  });

  it("strips quotes from frontmatter values", () => {
    const content = `---\ntitle: "Quoted Value"\ndescription: 'Single Quoted'\n---\n\nBody`;
    const result = extractFrontmatter(content);
    expect(result.frontmatter.title).toBe("Quoted Value");
    expect(result.frontmatter.description).toBe("Single Quoted");
  });

  it("handles empty content", () => {
    const result = extractFrontmatter("");
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("");
  });
});

describe("serializeFrontmatter", () => {
  it("serializes frontmatter with body", () => {
    const result = serializeFrontmatter(
      { title: "Test", description: "A test page" },
      "# Content",
    );
    expect(result).toContain("---");
    expect(result).toContain("title: Test");
    expect(result).toContain("description: A test page");
    expect(result).toContain("# Content");
  });

  it("returns body only when frontmatter is empty", () => {
    const result = serializeFrontmatter({}, "# Content");
    expect(result).toBe("# Content");
  });

  it("quotes values containing special characters", () => {
    const result = serializeFrontmatter(
      { title: 'Value with: colon and "quotes"' },
      "Body",
    );
    expect(result).toContain('"Value with: colon and \\"quotes\\""');
  });

  it("skips empty values", () => {
    const result = serializeFrontmatter(
      { title: "Keep", description: "" },
      "Body",
    );
    expect(result).toContain("title: Keep");
    expect(result).not.toContain("description");
  });
});

describe("countLines", () => {
  it("counts single line", () => {
    expect(countLines("hello")).toBe(1);
  });

  it("counts multiple lines", () => {
    expect(countLines("a\nb\nc")).toBe(3);
  });

  it("returns 1 for empty string", () => {
    expect(countLines("")).toBe(1);
  });
});

describe("generateLineNumbers", () => {
  it("generates correct line number array", () => {
    expect(generateLineNumbers("a\nb\nc")).toEqual([1, 2, 3]);
  });

  it("generates [1] for empty string", () => {
    expect(generateLineNumbers("")).toEqual([1]);
  });
});

describe("extractToc", () => {
  it("extracts headings from markdown body", () => {
    const body = `# Introduction

Some text

## Getting Started

More text

### Step 1

#### Nested`;

    const toc = extractToc(body);
    expect(toc).toHaveLength(4);
    expect(toc[0]).toEqual({
      level: 1,
      text: "Introduction",
      id: "introduction",
    });
    expect(toc[1]).toEqual({
      level: 2,
      text: "Getting Started",
      id: "getting-started",
    });
    expect(toc[2]).toEqual({ level: 3, text: "Step 1", id: "step-1" });
    expect(toc[3]).toEqual({ level: 4, text: "Nested", id: "nested" });
  });

  it("returns empty array for content without headings", () => {
    expect(extractToc("Just some text\n\nMore text")).toEqual([]);
  });

  it("strips special characters from heading IDs", () => {
    const toc = extractToc("## Hello, World! (Test)");
    expect(toc[0].id).toBe("hello-world-test");
  });
});

describe("createAutoSave", () => {
  it("calls save function after delay", async () => {
    vi.useFakeTimers();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const autoSave = createAutoSave(saveFn, 1000);

    autoSave.trigger("content v1");
    expect(saveFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(saveFn).toHaveBeenCalledWith("content v1");

    vi.useRealTimers();
  });

  it("debounces rapid triggers", async () => {
    vi.useFakeTimers();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const autoSave = createAutoSave(saveFn, 1000);

    autoSave.trigger("v1");
    vi.advanceTimersByTime(500);
    autoSave.trigger("v2");
    vi.advanceTimersByTime(500);
    autoSave.trigger("v3");
    vi.advanceTimersByTime(1000);

    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith("v3");

    vi.useRealTimers();
  });

  it("cancel prevents pending save", () => {
    vi.useFakeTimers();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const autoSave = createAutoSave(saveFn, 1000);

    autoSave.trigger("content");
    autoSave.cancel();
    vi.advanceTimersByTime(2000);

    expect(saveFn).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("flush executes pending save immediately", () => {
    vi.useFakeTimers();
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const autoSave = createAutoSave(saveFn, 5000);

    autoSave.trigger("flush-me");
    autoSave.flush();

    expect(saveFn).toHaveBeenCalledWith("flush-me");

    vi.useRealTimers();
  });
});

describe("mdxSnippets", () => {
  it("has required snippet keys", () => {
    expect(mdxSnippets.tab).toContain("<Tab");
    expect(mdxSnippets.dropdown).toContain("<Dropdown");
    expect(mdxSnippets.anchor).toContain("<Anchor");
    expect(mdxSnippets.card).toContain("<Card");
    expect(mdxSnippets.language).toContain("<Language");
    expect(mdxSnippets.product).toContain("<Product");
    expect(mdxSnippets.version).toContain("<Version");
    expect(mdxSnippets.codeBlock).toContain("```");
    expect(mdxSnippets.columns).toContain("<Columns");
  });
});

describe("visual editor markdown transforms", () => {
  it("preserves block spacing through html conversion", () => {
    const markdown = `# Title

Paragraph copy.

## Section

More text.`;

    expect(htmlToMarkdown(markdownToHtml(markdown))).toBe(markdown);
  });

  it("preserves MDX component blocks through html conversion", () => {
    const markdown = `<Card title="Quickstart" icon="book" href="/docs">
  Ship docs faster
</Card>`;

    expect(htmlToMarkdown(markdownToHtml(markdown))).toBe(markdown);
  });

  it("preserves spacing between adjacent MDX blocks after a visual-editor round-trip", () => {
    const markdown = `# QA Title

This is **bold** and *italic* with a [link](https://example.com).

## Section One

Paragraph text.

<Card title="Quickstart" icon="book" href="/docs">
  Ship docs faster
</Card>

<Note>
  Remember to deploy.
</Note>

<Tab title="cURL">
  curl https://example.com
</Tab>

<Language code="typescript" />

<Version tag="v1" />
<Language code="typescript" />`;

    const roundTrip = htmlToMarkdown(markdownToHtml(markdown));

    expect(roundTrip).toContain("This is **bold** and *italic*");
    expect(roundTrip).toContain("Paragraph text.");
    expect(roundTrip).toContain("</Card>\n\n<Note>");
    expect(roundTrip).toContain("</Note>\n\n<Tab");
    expect(roundTrip).toContain("</Tab>\n\n<Language");
    expect(roundTrip).toContain('<Version tag="v1" />\n\n<Language');
    expect(roundTrip).not.toContain("</Card><Note>");
    expect(roundTrip).not.toContain("</Note><Tab");
    expect(roundTrip).not.toContain("</Tab><Language");
  });

  it("renders markdown images as markdown after round-trip", () => {
    const markdown = "![Diagram](https://placehold.co/600x400/png)";
    expect(htmlToMarkdown(markdownToHtml(markdown))).toBe(markdown);
  });

  it("renders GitHub README tables, blockquotes, linked images, and fenced code without leaking markdown syntax", () => {
    const markdown = `[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

![Architecture](./docs/architecture.png)

> **Note for AI agents:** Start at [Setup](./docs/setup.md).

| Metric | Result |
|--------|--------|
| Features built | **52** |
| API endpoints | 16+ |

Verify:

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/ralph-to-ralph.git
cd ralph-to-ralph
\`\`\`

### Optional: track upstream for future pipeline improvements`;

    const html = markdownToHtml(markdown);

    expect(html).toContain(
      '<a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>',
    );
    expect(html).toContain(
      '<img src="./docs/architecture.png" alt="Architecture" />',
    );
    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<strong>Note for AI agents:</strong> Start at <a href="./docs/setup.md">Setup</a>.',
    );
    expect(html).toContain("markdown-table-preview");
    expect(html).toContain("<pre><code>");
    expect(html).toContain(
      "git clone https://github.com/YOUR_USERNAME/ralph-to-ralph.git",
    );
    expect(html).toContain(
      "<h3>Optional: track upstream for future pipeline improvements</h3>",
    );
    expect(html).not.toContain("!Architecture");
    expect(html).not.toContain("| Metric | Result |");
    expect(html).not.toContain("<code>bash");
  });
});

describe("insertSnippetAtCursor", () => {
  it("inserts snippet at beginning of text", () => {
    const result = insertSnippetAtCursor("existing text", 0, "<Card />");
    expect(result.newText).toContain("<Card />");
    expect(result.newText).toContain("existing text");
  });

  it("inserts snippet at end of text", () => {
    const result = insertSnippetAtCursor("existing", 8, "<Card />");
    expect(result.newText).toContain("existing");
    expect(result.newText).toContain("<Card />");
  });

  it("inserts snippet in middle of text", () => {
    const result = insertSnippetAtCursor("line1\nline3", 6, "line2");
    expect(result.newText).toContain("line1");
    expect(result.newText).toContain("line2");
    expect(result.newText).toContain("line3");
  });

  it("adds newlines when needed", () => {
    const result = insertSnippetAtCursor("before", 6, "snippet");
    expect(result.newText).toBe("before\nsnippet");
  });

  it("returns correct cursor position", () => {
    const result = insertSnippetAtCursor("ab", 1, "X");
    expect(result.newCursorPos).toBeGreaterThan(0);
  });
});
