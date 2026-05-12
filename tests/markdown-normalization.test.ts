import { normalizeMarkdownContent } from "@/lib/markdown-normalization";
import { describe, expect, it } from "vitest";

describe("normalizeMarkdownContent", () => {
  it("repairs fused headings and paragraphs using the known page title", () => {
    const malformed =
      "# IntroductionGenerated docs content updated.## Deploy verificationPublishing from the editor now saves the page.";

    expect(
      normalizeMarkdownContent(malformed, { title: "Introduction" }),
    ).toBe(`# Introduction

Generated docs content updated.

## Deploy verification

Publishing from the editor now saves the page.`);
  });

  it("keeps fenced code content unchanged while normalizing surrounding headings", () => {
    const markdown = `# GuideInstall the SDK.

\`\`\`ts
const sample = "# Not a headingBody";
\`\`\`

## NextStepUse the dashboard.`;

    expect(normalizeMarkdownContent(markdown, { title: "Guide" })).toBe(`# Guide

Install the SDK.

\`\`\`ts
const sample = "# Not a headingBody";
\`\`\`

## NextStepUse the dashboard.`);
  });

  it("does not split single-token CamelCase headings without a known title", () => {
    expect(normalizeMarkdownContent("# OAuthFlowGuide")).toBe(
      "# OAuthFlowGuide",
    );
  });
});
