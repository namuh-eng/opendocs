import { describe, expect, it } from "vitest";
import { KATEX_CSS_URL, renderLatex } from "@/lib/latex";

describe("renderLatex", () => {
  describe("inline math ($...$)", () => {
    it("renders a simple inline expression", () => {
      const result = renderLatex("<p>The value of $x^2$ is important.</p>");
      expect(result).toContain("katex");
      expect(result).not.toContain("$x^2$");
      // Should be inline (no display-mode class)
      expect(result).not.toContain("katex-display");
    });

    it("renders multiple inline expressions in one paragraph", () => {
      const result = renderLatex("<p>Given $a$ and $b$, compute $a+b$.</p>");
      // All three should be rendered
      expect(result).not.toContain("$a$");
      expect(result).not.toContain("$b$");
      expect(result).not.toContain("$a+b$");
      const katexCount = (result.match(/class="katex"/g) || []).length;
      expect(katexCount).toBe(3);
    });

    it("renders Greek letters", () => {
      const result = renderLatex("<p>$\\alpha + \\beta = \\gamma$</p>");
      expect(result).toContain("katex");
      expect(result).toContain("α");
    });

    it("renders fractions inline", () => {
      const result = renderLatex("<p>$\\frac{1}{2}$</p>");
      expect(result).toContain("katex");
      expect(result).toContain("frac");
    });

    it("does not match escaped dollar signs", () => {
      const input = "<p>The price is \\$5 and \\$10.</p>";
      const result = renderLatex(input);
      // Should not be treated as math
      expect(result).not.toContain("katex");
    });

    it("does not match dollar signs with newlines between them", () => {
      const input = "<p>$hello\nworld$</p>";
      const result = renderLatex(input);
      expect(result).not.toContain("katex");
    });
  });

  describe("block math ($$...$$)", () => {
    it("renders a block equation", () => {
      const result = renderLatex("<p>$$E = mc^2$$</p>");
      expect(result).toContain("katex-display");
      expect(result).not.toContain("$$");
    });

    it("renders a multiline block equation", () => {
      const result = renderLatex(
        "<p>$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$</p>",
      );
      expect(result).toContain("katex-display");
    });

    it("renders integrals in display mode", () => {
      const result = renderLatex("<p>$$\\int_0^\\infty e^{-x} dx = 1$$</p>");
      expect(result).toContain("katex-display");
      expect(result).toContain("∫");
    });

    it("renders matrix notation", () => {
      const result = renderLatex(
        "$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$",
      );
      expect(result).toContain("katex-display");
    });
  });

  describe("code block protection", () => {
    it("does not process math inside <code> tags", () => {
      const input = "<p>See <code>$x^2$</code> for details.</p>";
      const result = renderLatex(input);
      expect(result).toContain("<code>$x^2$</code>");
      expect(result).not.toContain("katex");
    });

    it("does not process math inside <pre> tags", () => {
      const input =
        '<pre class="code-block"><code>const price = $100;\nconst total = $200;</code></pre>';
      const result = renderLatex(input);
      expect(result).toContain("$100");
      expect(result).not.toContain("katex");
    });

    it("processes math outside code blocks while preserving code blocks", () => {
      const input =
        "<p>$x^2$ is good</p>\n<pre><code>$not_math$</code></pre>\n<p>$y^2$ too</p>";
      const result = renderLatex(input);
      // Math outside code blocks should be rendered
      expect(result).toContain("katex");
      // Code block should be preserved
      expect(result).toContain("<pre><code>$not_math$</code></pre>");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(renderLatex("")).toBe("");
    });

    it("returns input unchanged when no math delimiters present", () => {
      const input = "<p>Hello world, no math here.</p>";
      expect(renderLatex(input)).toBe(input);
    });

    it("handles invalid LaTeX gracefully", () => {
      const result = renderLatex("<p>$\\invalid_command{x}$</p>");
      // KaTeX with throwOnError: false renders a best-effort output
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("does not match single $ signs that are not math", () => {
      const input = "<p>The price is $50.</p>";
      // This has no closing $, so it should not be processed
      const result = renderLatex(input);
      expect(result).toBe(input);
    });

    it("handles adjacent inline and block math", () => {
      const result = renderLatex(
        "<p>Inline $x$ and block:</p>\n$$y = mx + b$$",
      );
      expect(result).toContain("katex");
      expect(result).toContain("katex-display");
    });

    it("does not process script tags", () => {
      const input = '<script>var $x = "$y";</script>';
      const result = renderLatex(input);
      expect(result).not.toContain("katex");
    });
  });

  describe("KATEX_CSS_URL", () => {
    it("points to a valid CDN URL", () => {
      expect(KATEX_CSS_URL).toContain("katex");
      expect(KATEX_CSS_URL).toContain(".css");
      expect(KATEX_CSS_URL).toMatch(/^https:\/\//);
    });

    it("includes the correct version", () => {
      expect(KATEX_CSS_URL).toContain("0.16");
    });
  });
});
