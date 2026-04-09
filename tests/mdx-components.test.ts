import {
  extractComponentBlocks,
  renderComponentBlock,
  renderMdxContent,
} from "@/lib/mdx-renderer";
import { describe, expect, it } from "vitest";

describe("MDX Component Library (feature-004a)", () => {
  // ── Cards & CardGroups ───────────────────────────────────────────────────

  describe("Cards with SVG icons", () => {
    it("renders Card with an SVG icon from icon prop", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Card",
        content: "Edit your docs locally",
        props: { title: "Edit locally", icon: "pencil", href: "/edit" },
      });
      expect(html).toContain("<svg");
      expect(html).toContain("Edit locally");
      expect(html).toContain("Edit your docs locally");
      expect(html).toContain('href="/edit"');
    });

    it("renders Card with unknown icon as text fallback", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Card",
        content: "Description",
        props: { title: "My Card", icon: "custom-emoji-🚀" },
      });
      expect(html).toContain("My Card");
      expect(html).toContain("card-icon");
    });

    it("renders Card without icon when icon prop is absent", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Card",
        content: "No icon card",
        props: { title: "Plain Card" },
      });
      expect(html).toContain("Plain Card");
      expect(html).not.toContain("card-icon");
    });

    it("renders CardGroup with correct grid columns", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "CardGroup",
        content:
          '<Card title="A" icon="star">\nFirst\n</Card>\n<Card title="B" icon="code">\nSecond\n</Card>',
        props: { cols: "2" },
      });
      expect(html).toContain("card-group");
      expect(html).toContain("repeat(2, 1fr)");
      expect(html).toContain("First");
      expect(html).toContain("Second");
    });

    it("renders Card with hover class for linked cards", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Card",
        content: "Click me",
        props: { title: "Link Card", href: "/page" },
      });
      expect(html).toContain("card-link");
      expect(html).toContain('href="/page"');
    });
  });

  // ── Steps ────────────────────────────────────────────────────────────────

  describe("Steps as expandable accordions", () => {
    it("renders Steps with details/summary expandable elements", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Steps",
        content:
          '<Step title="Set up environment">\nClone the repo\n</Step>\n<Step title="Deploy changes">\nPush to main\n</Step>',
        props: {},
      });
      expect(html).toContain("steps");
      expect(html).toContain('<details class="step">');
      expect(html).toContain('summary class="step-summary"');
      expect(html).toContain("Set up environment");
      expect(html).toContain("Deploy changes");
      expect(html).toContain("Clone the repo");
      expect(html).toContain("Push to main");
    });

    it("renders Steps with step numbering", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Steps",
        content:
          '<Step title="First">\nA\n</Step>\n<Step title="Second">\nB\n</Step>',
        props: {},
      });
      expect(html).toContain("step-number");
      expect(html).toContain("step-chevron");
    });

    it("renders Step with icon prop when provided", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Steps",
        content:
          '<Step title="Install" icon="terminal">\nRun npm install\n</Step>',
        props: {},
      });
      expect(html).toContain("Install");
      expect(html).toContain("Run npm install");
    });

    it("renders Steps with connector line between steps", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Steps",
        content:
          '<Step title="One">\nA\n</Step>\n<Step title="Two">\nB\n</Step>',
        props: {},
      });
      expect(html).toContain("step");
      // There should be multiple steps
      const stepCount = (html.match(/class="step"/g) || []).length;
      expect(stepCount).toBe(2);
    });

    it("renders code blocks inside expandable step content", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Steps",
        content:
          '<Step title="Install">\n```bash\nnpm install\n```\n</Step>\n<Step title="Run">\n```bash\nnpm run dev\n```\n</Step>',
        props: {},
      });

      expect(html).toContain('<details class="step">');
      expect(html).toContain("code-block");
      expect(html).toContain('class="language-bash"');
      expect(html).toContain("npm run dev");
    });
  });

  // ── Callouts with title support ──────────────────────────────────────────

  describe("Callouts with title prop", () => {
    it("renders Note with title when title prop provided", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Note",
        content: "Follow our three step quickstart guide.",
        props: { title: "Start here" },
      });
      expect(html).toContain("callout");
      expect(html).toContain("callout-title");
      expect(html).toContain("Start here");
      expect(html).toContain("Follow our three step quickstart guide.");
    });

    it("renders Warning with title", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Warning",
        content: "This action cannot be undone.",
        props: { title: "Danger zone" },
      });
      expect(html).toContain("callout-warning");
      expect(html).toContain("callout-title");
      expect(html).toContain("Danger zone");
    });

    it("renders Tip without title when prop missing", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Tip",
        content: "Pro tip here",
        props: {},
      });
      expect(html).toContain("callout-tip");
      expect(html).toContain("Pro tip here");
      expect(html).not.toContain("callout-title");
    });

    it("renders Info callout with icon", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Info",
        content: "Some information",
        props: {},
      });
      expect(html).toContain("callout-note");
      expect(html).toContain("<svg");
      expect(html).toContain("callout-icon");
    });

    it("renders Check callout with check icon", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "Check",
        content: "All good!",
        props: {},
      });
      expect(html).toContain("callout-tip");
      expect(html).toContain("<svg");
    });
  });

  // ── Code blocks ──────────────────────────────────────────────────────────

  describe("Code blocks with filename and Ask AI", () => {
    it("renders code block with filename in header tab", () => {
      const md = "```java HelloWorld.java\nclass HelloWorld {}\n```";
      const html = renderMdxContent(md);
      expect(html).toContain("code-header");
      expect(html).toContain("HelloWorld.java");
    });

    it("renders code block with copy button", () => {
      const md = "```python\nprint('hello')\n```";
      const html = renderMdxContent(md);
      expect(html).toContain("code-copy");
      expect(html).toContain("Copy");
    });

    it("renders code block with Ask AI button", () => {
      const md = "```typescript\nconst x: number = 1;\n```";
      const html = renderMdxContent(md);
      expect(html).toContain("code-ask-ai");
      expect(html).toContain("Ask AI");
    });

    it("renders code block with language label when language specified", () => {
      const md = "```javascript\nconst x = 1;\n```";
      const html = renderMdxContent(md);
      expect(html).toContain("code-lang");
      expect(html).toContain("javascript");
    });

    it("renders code block without header when no language specified", () => {
      const md = "```\nplain code\n```";
      const html = renderMdxContent(md);
      expect(html).toContain("plain code");
    });

    it("applies basic syntax highlighting to keywords", () => {
      const md = "```javascript\nconst x = 1;\nfunction hello() {}\n```";
      const html = renderMdxContent(md);
      expect(html).toContain("syntax-keyword");
    });

    it("does not corrupt injected syntax highlight markup", () => {
      const md =
        "```typescript\nexport function greet(name: string) {\n  return `hello, ${name}`;\n}\n```";
      const html = renderMdxContent(md);
      expect(html).toContain('<span class="syntax-keyword">function</span>');
      expect(html).toContain('<span class="syntax-keyword">return</span>');
      expect(html).not.toContain("<span <span");
      expect(html).not.toContain(
        '<span <span class="syntax-keyword">class</span>=',
      );
    });

    it("highlights string literals in code", () => {
      const md = '```javascript\nconst name = "world";\n```';
      const html = renderMdxContent(md);
      expect(html).toContain("syntax-string");
    });

    it("highlights comments in code", () => {
      const md = "```javascript\n// This is a comment\nconst x = 1;\n```";
      const html = renderMdxContent(md);
      expect(html).toContain("syntax-comment");
    });
  });

  // ── CodeGroup ────────────────────────────────────────────────────────────

  describe("CodeGroup with enhanced code blocks", () => {
    it("renders CodeGroup with language tabs and copy buttons", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "CodeGroup",
        content: "```javascript\nconst x = 1;\n```\n\n```python\nx = 1\n```",
        props: {},
      });
      expect(html).toContain("code-group");
      expect(html).toContain("tab-button");
      expect(html).toContain("javascript");
      expect(html).toContain("python");
    });

    it("renders CodeGroup with copy button in each panel", () => {
      const html = renderComponentBlock({
        type: "component",
        tag: "CodeGroup",
        content: "```bash\nnpm install\n```\n\n```bash\nyarn add\n```",
        props: {},
      });
      expect(html).toContain("code-copy");
    });
  });

  // ── Integration: renderMdxContent ────────────────────────────────────────

  describe("renderMdxContent integration", () => {
    it("renders mixed markdown and components", () => {
      const mdx = `# Welcome

Some intro text.

<Note title="Start here">
Follow the quickstart guide.
</Note>

<CardGroup cols={2}>
<Card title="Edit locally" icon="pencil" href="/edit">
Edit your docs locally
</Card>
<Card title="Customize" icon="palette" href="/customize">
Match your brand
</Card>
</CardGroup>`;

      const html = renderMdxContent(mdx);
      expect(html).toContain("<h1");
      expect(html).toContain("Welcome");
      expect(html).toContain("callout");
      expect(html).toContain("Start here");
      expect(html).toContain("card-group");
      expect(html).toContain("Edit locally");
      expect(html).toContain("Customize");
    });

    it("renders content with steps and code blocks", () => {
      const mdx = `## Getting Started

<Steps>
<Step title="Install">
Run the following command:

\`\`\`bash
npm install mintlify
\`\`\`
</Step>
<Step title="Start server">
Run the dev server
</Step>
</Steps>`;

      const html = renderMdxContent(mdx);
      expect(html).toContain("Getting Started");
      expect(html).toContain("steps");
      expect(html).toContain("Install");
      expect(html).toContain("Start server");
    });
  });
});
