import { extractFrontmatter, extractToc } from "@/lib/editor";
import { describe, expect, it } from "vitest";

describe("Table of Contents — extractToc", () => {
  it("extracts H2 and H3 headings from markdown", () => {
    const content = `# Title
## Getting Started
Some text
### Installation
More text
## Usage
### Configuration
#### Deep Heading
## FAQ`;

    const toc = extractToc(content);
    // Should include all heading levels
    expect(toc.length).toBe(7);
    expect(toc[0]).toEqual({ level: 1, text: "Title", id: "title" });
    expect(toc[1]).toEqual({
      level: 2,
      text: "Getting Started",
      id: "getting-started",
    });
    expect(toc[2]).toEqual({
      level: 3,
      text: "Installation",
      id: "installation",
    });
  });

  it("generates correct slug IDs for headings", () => {
    const content = `## Hello World
## Special Characters!
## Multiple   Spaces
## UPPERCASE Heading`;

    const toc = extractToc(content);
    expect(toc[0].id).toBe("hello-world");
    expect(toc[1].id).toBe("special-characters");
    expect(toc[2].id).toBe("multiple-spaces");
    expect(toc[3].id).toBe("uppercase-heading");
  });

  it("returns empty array for content with no headings", () => {
    const content = "Just some paragraph text\nwith multiple lines.";
    const toc = extractToc(content);
    expect(toc).toEqual([]);
  });

  it("handles empty content", () => {
    const toc = extractToc("");
    expect(toc).toEqual([]);
  });

  it("does not extract headings inside code blocks", () => {
    const content = `## Real Heading
\`\`\`markdown
## Inside Code Block
\`\`\`
## Another Real Heading`;

    const toc = extractToc(content);
    expect(toc.length).toBe(2);
    expect(toc[0].text).toBe("Real Heading");
    expect(toc[1].text).toBe("Another Real Heading");
  });

  it("handles indented code blocks", () => {
    const content = `## Header
    \`\`\`
    # Indented Comment
    \`\`\`
## Footer`;
    const toc = extractToc(content);
    expect(toc.length).toBe(2);
    expect(toc[0].text).toBe("Header");
    expect(toc[1].text).toBe("Footer");
  });

  it("preserves heading level numbers correctly", () => {
    const content = `## Level 2
### Level 3
#### Level 4
##### Level 5`;

    const toc = extractToc(content);
    expect(toc[0].level).toBe(2);
    expect(toc[1].level).toBe(3);
    expect(toc[2].level).toBe(4);
    expect(toc[3].level).toBe(5);
  });
});

describe("Table of Contents — extractFrontmatter", () => {
  it("extracts title from frontmatter", () => {
    const content = `---
title: "My Custom Title"
---
# Actual Heading`;
    const { frontmatter } = extractFrontmatter(content);
    expect(frontmatter.title).toBe("My Custom Title");
  });
});

describe("Table of Contents — filterTocForDisplay", () => {
  it("filters to only H2 and H3 entries", () => {
    const content = `# Title
## Section One
### Sub Section
#### Deep
## Section Two`;

    const toc = extractToc(content);
    const filtered = toc.filter((e) => e.level >= 2 && e.level <= 3);
    expect(filtered.length).toBe(3);
    expect(filtered[0].text).toBe("Section One");
    expect(filtered[1].text).toBe("Sub Section");
    expect(filtered[2].text).toBe("Section Two");
  });

  it("indentation: H3 should be indented relative to H2", () => {
    const content = `## Parent
### Child`;

    const toc = extractToc(content);
    const filtered = toc.filter((e) => e.level >= 2 && e.level <= 3);
    // H2 level=2, H3 level=3 — H3 should have more padding
    expect(filtered[0].level).toBe(2);
    expect(filtered[1].level).toBe(3);
    expect(filtered[1].level).toBeGreaterThan(filtered[0].level);
  });
});

describe("Table of Contents — rendering structure", () => {
  it("TOC entries have required fields for rendering", () => {
    const content = `## Getting Started
### Prerequisites`;

    const toc = extractToc(content);
    for (const entry of toc) {
      expect(entry).toHaveProperty("level");
      expect(entry).toHaveProperty("text");
      expect(entry).toHaveProperty("id");
      expect(typeof entry.level).toBe("number");
      expect(typeof entry.text).toBe("string");
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.text.length).toBeGreaterThan(0);
    }
  });

  it("IDs are URL-safe anchors", () => {
    const content = `## A Heading With Spaces
## another-with-dashes
## MixedCase123`;

    const toc = extractToc(content);
    for (const entry of toc) {
      // IDs should not contain spaces or uppercase
      expect(entry.id).not.toMatch(/\s/);
      expect(entry.id).not.toMatch(/[A-Z]/);
      // IDs should be valid anchor targets
      expect(entry.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("anchor href format matches heading IDs", () => {
    const content = "## Quick Start";
    const toc = extractToc(content);
    // The component renders href={`#${entry.id}`}
    expect(`#${toc[0].id}`).toBe("#quick-start");
  });
});
