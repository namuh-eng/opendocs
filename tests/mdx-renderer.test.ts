import {
  type DocsNavGroup,
  type DocsNavItem,
  buildDocsNav,
  extractComponentBlocks,
  parseMdxToHtml,
  renderComponentBlock,
  resolvePageFromSlug,
} from "@/lib/mdx-renderer";
import { describe, expect, it } from "vitest";

describe("MDX Renderer utilities", () => {
  describe("parseMdxToHtml", () => {
    it("converts markdown headings to HTML with IDs", () => {
      const result = parseMdxToHtml("# Hello World");
      expect(result).toContain("<h1");
      expect(result).toContain("hello-world");
      expect(result).toContain("Hello World");
    });

    it("labels heading permalink anchors for assistive technology", () => {
      const result = parseMdxToHtml("## Getting Started");
      expect(result).toContain('href="#getting-started"');
      expect(result).toContain('class="heading-anchor"');
      expect(result).toContain('aria-label="Navigate to header"');
    });

    it("converts bold and italic text", () => {
      const result = parseMdxToHtml("**bold** and *italic*");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });

    it("converts inline code", () => {
      const result = parseMdxToHtml("Use `npm install` to add packages");
      expect(result).toContain("<code>");
      expect(result).toContain("npm install");
    });

    it("converts code blocks with language", () => {
      const result = parseMdxToHtml("```javascript\nconst x = 1;\n```");
      expect(result).toContain("<pre");
      expect(result).toContain("<code");
      expect(result).toContain("x = 1;");
      expect(result).toContain("syntax-keyword");
    });

    it("converts unordered lists", () => {
      const result = parseMdxToHtml("- Item one\n- Item two\n- Item three");
      expect(result).toContain("<ul");
      expect(result).toContain("<li");
      expect(result).toContain("Item one");
    });

    it("converts ordered lists", () => {
      const result = parseMdxToHtml("1. First\n2. Second\n3. Third");
      expect(result).toContain("<ol");
      expect(result).toContain("<li");
      expect(result).toContain("First");
    });

    it("converts links", () => {
      const result = parseMdxToHtml("[Click here](https://example.com)");
      expect(result).toContain("<a");
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain("Click here");
    });

    it("converts blockquotes", () => {
      const result = parseMdxToHtml("> This is a quote");
      expect(result).toContain("<blockquote");
      expect(result).toContain("This is a quote");
    });

    it("handles multiple headings with slugified IDs", () => {
      const md = "## Getting Started\n\n## API Reference\n\n## Code Examples";
      const result = parseMdxToHtml(md);
      expect(result).toContain('id="getting-started"');
      expect(result).toContain('id="api-reference"');
      expect(result).toContain('id="code-examples"');
    });

    it("converts horizontal rules", () => {
      const result = parseMdxToHtml("Above\n\n---\n\nBelow");
      expect(result).toContain("<hr");
    });

    it("converts images", () => {
      const result = parseMdxToHtml("![Alt text](/image.png)");
      expect(result).toContain("<img");
      expect(result).toContain('src="/image.png"');
      expect(result).toContain('alt="Alt text"');
    });

    it("handles empty content", () => {
      const result = parseMdxToHtml("");
      expect(result).toBe("");
    });

    it("converts tables (GFM)", () => {
      const md = "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |";
      const result = parseMdxToHtml(md);
      expect(result).toContain("<table");
      expect(result).toContain("<th");
      expect(result).toContain("Header 1");
      expect(result).toContain("Cell 1");
    });
  });

  describe("extractComponentBlocks", () => {
    it("extracts Note component", () => {
      const md = "Before\n\n<Note>\nImportant info\n</Note>\n\nAfter";
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(3);
      expect(blocks[0].type).toBe("markdown");
      expect(blocks[0].content).toContain("Before");
      expect(blocks[1].type).toBe("component");
      expect(blocks[1].tag).toBe("Note");
      expect(blocks[1].content).toContain("Important info");
      expect(blocks[2].type).toBe("markdown");
      expect(blocks[2].content).toContain("After");
    });

    it("extracts Card component with props", () => {
      const md =
        '<Card title="My Card" icon="star" href="/link">\nCard content\n</Card>';
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe("component");
      expect(blocks[0].tag).toBe("Card");
      expect(blocks[0].props?.title).toBe("My Card");
      expect(blocks[0].props?.icon).toBe("star");
      expect(blocks[0].props?.href).toBe("/link");
      expect(blocks[0].content).toContain("Card content");
    });

    it("extracts CardGroup with nested Cards", () => {
      const md =
        '<CardGroup cols={2}>\n<Card title="A">\nFirst\n</Card>\n<Card title="B">\nSecond\n</Card>\n</CardGroup>';
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe("component");
      expect(blocks[0].tag).toBe("CardGroup");
    });

    it("extracts Steps component", () => {
      const md =
        '<Steps>\n<Step title="Step 1">\nDo this\n</Step>\n<Step title="Step 2">\nDo that\n</Step>\n</Steps>';
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe("component");
      expect(blocks[0].tag).toBe("Steps");
    });

    it("extracts Tabs component", () => {
      const md =
        '<Tabs>\n<Tab title="Tab 1">\nContent 1\n</Tab>\n<Tab title="Tab 2">\nContent 2\n</Tab>\n</Tabs>';
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe("component");
      expect(blocks[0].tag).toBe("Tabs");
    });

    it("handles markdown-only content (no components)", () => {
      const md = "# Hello\n\nJust regular markdown.";
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe("markdown");
    });

    it("extracts Warning and Tip callouts", () => {
      const md = "<Warning>\nBe careful!\n</Warning>";
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].tag).toBe("Warning");
    });

    it("extracts Accordion component", () => {
      const md = '<Accordion title="FAQ Question">\nThe answer\n</Accordion>';
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].tag).toBe("Accordion");
      expect(blocks[0].props?.title).toBe("FAQ Question");
    });

    it("extracts AccordionGroup", () => {
      const md =
        '<AccordionGroup>\n<Accordion title="Q1">\nA1\n</Accordion>\n<Accordion title="Q2">\nA2\n</Accordion>\n</AccordionGroup>';
      const blocks = extractComponentBlocks(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].tag).toBe("AccordionGroup");
    });

    it("extracts self-closing components", () => {
      const md = 'Some text\n\n<Frame caption="Screenshot" />\n\nMore text';
      const blocks = extractComponentBlocks(md);
      const frameBlock = blocks.find(
        (b) => b.type === "component" && b.tag === "Frame",
      );
      expect(frameBlock).toBeDefined();
      expect(frameBlock?.props?.caption).toBe("Screenshot");
    });
  });

  describe("renderComponentBlock", () => {
    it("renders Note callout with info styling", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Note",
        content: "Important info",
        props: {},
      });
      expect(html).toContain("Important info");
      expect(html).toContain("callout");
      expect(html).toContain("note");
    });

    it("renders Warning callout with warning styling", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Warning",
        content: "Be careful",
        props: {},
      });
      expect(html).toContain("Be careful");
      expect(html).toContain("warning");
    });

    it("renders Tip callout", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Tip",
        content: "Pro tip",
        props: {},
      });
      expect(html).toContain("Pro tip");
      expect(html).toContain("tip");
    });

    it("renders Card with title and content", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Card",
        content: "Card description",
        props: { title: "My Card", icon: "star", href: "/link" },
      });
      expect(html).toContain("My Card");
      expect(html).toContain("Card description");
      expect(html).toContain("/link");
    });

    it("renders Steps with numbered steps", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Steps",
        content:
          '<Step title="First">\nDo this\n</Step>\n<Step title="Second">\nDo that\n</Step>',
        props: {},
      });
      expect(html).toContain("First");
      expect(html).toContain("Second");
      expect(html).toContain("Do this");
      expect(html).toContain("Do that");
    });

    it("renders Accordion with expandable content", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Accordion",
        content: "Hidden answer",
        props: { title: "FAQ" },
      });
      expect(html).toContain("FAQ");
      expect(html).toContain("Hidden answer");
      expect(html).toContain("details");
    });

    it("renders CodeGroup with tabs", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "CodeGroup",
        content: "```javascript\nconst x = 1;\n```\n\n```python\nx = 1\n```",
        props: {},
      });
      expect(html).toContain("javascript");
      expect(html).toContain("python");
    });
  });

  describe("buildDocsNav", () => {
    it("builds navigation from flat page list", () => {
      const pages = [
        { id: "1", path: "introduction", title: "Introduction" },
        { id: "2", path: "quickstart", title: "Quickstart" },
        {
          id: "3",
          path: "essentials/markdown",
          title: "Markdown Syntax",
        },
        {
          id: "4",
          path: "essentials/code-blocks",
          title: "Code Blocks",
        },
        {
          id: "5",
          path: "customization/settings",
          title: "Global Settings",
        },
      ];

      const nav = buildDocsNav(pages);

      // Should have root-level items and groups
      expect(nav.length).toBeGreaterThan(0);

      // Find the essentials group
      const essentialsGroup = nav.find(
        (n) => n.type === "group" && n.label.toLowerCase() === "essentials",
      );
      expect(essentialsGroup).toBeDefined();
      if (essentialsGroup?.type === "group") {
        expect(essentialsGroup.items.length).toBe(2);
      }
    });

    it("returns items without groups for root-level pages", () => {
      const pages = [
        { id: "1", path: "introduction", title: "Introduction" },
        { id: "2", path: "quickstart", title: "Quickstart" },
      ];

      const nav = buildDocsNav(pages);
      const items = nav.filter((n) => n.type === "item");
      expect(items.length).toBe(2);
    });

    it("handles deeply nested paths", () => {
      const pages = [
        {
          id: "1",
          path: "api/endpoints/users/list",
          title: "List Users",
        },
      ];

      const nav = buildDocsNav(pages);
      expect(nav.length).toBeGreaterThan(0);
    });

    it("handles empty page list", () => {
      const nav = buildDocsNav([]);
      expect(nav).toEqual([]);
    });
  });

  describe("resolvePageFromSlug", () => {
    const pages = [
      {
        id: "1",
        path: "introduction",
        title: "Introduction",
        content: "# Intro",
        isPublished: true,
      },
      {
        id: "2",
        path: "quickstart",
        title: "Quickstart",
        content: "# Quick",
        isPublished: true,
      },
      {
        id: "3",
        path: "essentials/markdown",
        title: "Markdown",
        content: "# MD",
        isPublished: true,
      },
      {
        id: "4",
        path: "draft-page",
        title: "Draft",
        content: "# Draft",
        isPublished: false,
      },
    ];

    it("resolves a root-level page by slug", () => {
      const page = resolvePageFromSlug(["introduction"], pages);
      expect(page).toBeDefined();
      expect(page?.title).toBe("Introduction");
    });

    it("resolves a nested page by slug segments", () => {
      const page = resolvePageFromSlug(["essentials", "markdown"], pages);
      expect(page).toBeDefined();
      expect(page?.title).toBe("Markdown");
    });

    it("returns undefined for non-existent slug", () => {
      const page = resolvePageFromSlug(["nonexistent"], pages);
      expect(page).toBeUndefined();
    });

    it("returns undefined for empty slug", () => {
      const page = resolvePageFromSlug([], pages);
      expect(page).toBeUndefined();
    });

    it("only returns published pages by default", () => {
      const page = resolvePageFromSlug(["draft-page"], pages);
      expect(page).toBeUndefined();
    });

    it("can include unpublished pages when flag is set", () => {
      const page = resolvePageFromSlug(["draft-page"], pages, true);
      expect(page).toBeDefined();
      expect(page?.title).toBe("Draft");
    });
  });
});
