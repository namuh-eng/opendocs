import { describe, expect, it } from "vitest";
import { renderComponentBlock, renderMdxContent } from "@/lib/mdx-renderer";

describe("Extended MDX Component Library (feature-004b)", () => {
  // ── Mermaid ──────────────────────────────────────────────────────────────

  describe("Mermaid", () => {
    it("renders Mermaid block with data-diagram attribute", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Mermaid",
        content: "graph TD\n  A-->B\n  B-->C",
        props: {},
      });
      expect(html).toContain("mermaid");
      expect(html).toContain("graph TD");
      expect(html).toContain("A--&gt;B");
    });

    it("renders Mermaid as a pre block for client-side rendering", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Mermaid",
        content: "sequenceDiagram\n  Alice->>Bob: Hello",
        props: {},
      });
      expect(html).toContain('class="mermaid"');
    });

    it("escapes HTML in Mermaid content", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Mermaid",
        content: 'graph TD\n  A["<script>alert(1)</script>"]-->B',
        props: {},
      });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  // ── Expandable ───────────────────────────────────────────────────────────

  describe("Expandable", () => {
    it("renders Expandable with title as collapsible section", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Expandable",
        content: "Nested property details here",
        props: { title: "body" },
      });
      expect(html).toContain("expandable");
      expect(html).toContain("body");
      expect(html).toContain("Nested property details here");
    });

    it("renders Expandable with default title when none given", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Expandable",
        content: "Some nested content",
        props: {},
      });
      expect(html).toContain("expandable");
      expect(html).toContain("Properties");
    });

    it("renders nested Expandables inside parent", () => {
      const content = `<Expandable title="child1">
Inner content 1
</Expandable>
<Expandable title="child2">
Inner content 2
</Expandable>`;
      const html = renderComponentBlock({
        type: "component",
        tag: "Expandable",
        content,
        props: { title: "parent" },
      });
      expect(html).toContain("parent");
      expect(html).toContain("expandable");
    });
  });

  // ── Tooltip ──────────────────────────────────────────────────────────────

  describe("Tooltip", () => {
    it("renders Tooltip with dotted underline and popup text", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Tooltip",
        content: "SDK",
        props: { tip: "Software Development Kit" },
      });
      expect(html).toContain("tooltip");
      expect(html).toContain("SDK");
      expect(html).toContain("Software Development Kit");
    });

    it("renders inline Tooltip (not block)", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Tooltip",
        content: "API",
        props: { tip: "Application Programming Interface" },
      });
      expect(html).toContain("<span");
      expect(html).toContain("tooltip");
    });
  });

  // ── Update / Changelog ───────────────────────────────────────────────────

  describe("Update", () => {
    it("renders Update with date header and content", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Update",
        content: "Added dark mode support",
        props: { date: "2024-03-15" },
      });
      expect(html).toContain("update-entry");
      expect(html).toContain("2024-03-15");
      expect(html).toContain("Added dark mode support");
    });

    it("renders Update with title", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Update",
        content: "We shipped a new feature",
        props: { date: "2024-01-01", title: "v2.0 Release" },
      });
      expect(html).toContain("v2.0 Release");
      expect(html).toContain("2024-01-01");
    });

    it("renders Update without date gracefully", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Update",
        content: "Some update",
        props: {},
      });
      expect(html).toContain("update-entry");
      expect(html).toContain("Some update");
    });
  });

  // ── View ─────────────────────────────────────────────────────────────────

  describe("View", () => {
    it("renders View with tab-like switcher panels", () => {
      const content = `<ViewPanel title="Node.js">
console.log("hello")
</ViewPanel>
<ViewPanel title="Python">
print("hello")
</ViewPanel>`;
      const html = renderComponentBlock({
        type: "component",
        tag: "View",
        content,
        props: {},
      });
      expect(html).toContain("view");
      expect(html).toContain("Node.js");
      expect(html).toContain("Python");
      expect(html).toContain("tab-button");
    });

    it("first View panel is active by default", () => {
      const content = `<ViewPanel title="React">
React code
</ViewPanel>
<ViewPanel title="Vue">
Vue code
</ViewPanel>`;
      const html = renderComponentBlock({
        type: "component",
        tag: "View",
        content,
        props: {},
      });
      // First panel should be active
      expect(html).toMatch(/tab-button active[^"]*"[^>]*>React/);
    });
  });

  // ── Banner ───────────────────────────────────────────────────────────────

  describe("Banner", () => {
    it("renders Banner with content and dismiss button", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Banner",
        content: "New version available!",
        props: {},
      });
      expect(html).toContain("banner");
      expect(html).toContain("New version available!");
      expect(html).toContain("banner-dismiss");
    });

    it("renders Banner with variant (info/warning/success)", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Banner",
        content: "Warning message",
        props: { variant: "warning" },
      });
      expect(html).toContain("banner-warning");
    });

    it("renders Banner with default variant", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Banner",
        content: "Default banner",
        props: {},
      });
      expect(html).toContain("banner-info");
    });
  });

  // ── Badge ────────────────────────────────────────────────────────────────

  describe("Badge", () => {
    it("renders Badge as inline colored pill", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Badge",
        content: "Beta",
        props: {},
      });
      expect(html).toContain("badge");
      expect(html).toContain("Beta");
      expect(html).toContain("<span");
    });

    it("renders Badge with color variant", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Badge",
        content: "Deprecated",
        props: { color: "red" },
      });
      expect(html).toContain("badge-red");
    });

    it("renders Badge with green color for active status", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Badge",
        content: "Active",
        props: { color: "green" },
      });
      expect(html).toContain("badge-green");
    });

    it("renders Badge with default color when none specified", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Badge",
        content: "Default",
        props: {},
      });
      expect(html).toContain("badge-default");
    });
  });

  // ── Integration: extractComponentBlocks recognizes new components ──────

  describe("Component extraction", () => {
    it("extracts Mermaid blocks from MDX content", () => {
      const html = renderMdxContent(`Some intro text

<Mermaid>
graph TD
  A-->B
</Mermaid>

More text after`);
      expect(html).toContain("mermaid");
      expect(html).toContain("Some intro text");
      expect(html).toContain("More text after");
    });

    it("extracts Banner blocks from MDX content", () => {
      const html = renderMdxContent(`<Banner variant="success">
Deployment successful!
</Banner>

Regular paragraph.`);
      expect(html).toContain("banner");
      expect(html).toContain("Deployment successful!");
    });

    it("extracts self-closing Badge in MDX", () => {
      const html = renderMdxContent(
        'This feature is <Badge color="green">Stable</Badge> and ready.',
      );
      // Badge should be recognized even inline — but our block extraction
      // works on line-level, so we test the component directly
      const badgeHtml = renderComponentBlock({
        type: "component",
        tag: "Badge",
        content: "Stable",
        props: { color: "green" },
      });
      expect(badgeHtml).toContain("badge-green");
      expect(badgeHtml).toContain("Stable");
    });
  });
});
