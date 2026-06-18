import { describe, expect, it } from "vitest";
import { buildDocsNav, renderMdxContent } from "@/lib/mdx-renderer";
import {
  filterPublicDocsVisiblePages,
  isBrokenGeneratedBadge,
  isPublicDocsVisiblePage,
} from "@/lib/public-docs-curation";

describe("public docs curation", () => {
  it("hides internal operational paths and generated artifact titles by default", () => {
    const pages = [
      { path: "introduction", title: "Introduction" },
      { path: ".claude/settings", title: "Claude settings" },
      { path: "ralph/build-loop-prompt", title: "Build Loop Prompt" },
      {
        path: "target-docs/linear-documentation-index",
        title: "Linear Documentation Index",
      },
      { path: "docs/qa-loop-prompt", title: "QA Loop Prompt" },
      {
        path: "tools/ever-cli-browser-control",
        title: "Ever CLI — Browser Control",
      },
    ];

    expect(filterPublicDocsVisiblePages(pages)).toEqual([
      { path: "introduction", title: "Introduction" },
    ]);
  });

  it("allows explicit public docs curation overrides", () => {
    expect(
      isPublicDocsVisiblePage({
        path: "target-docs/reference",
        title: "Public reference",
        frontmatter: { publicDocs: true },
      }),
    ).toBe(true);

    expect(
      isPublicDocsVisiblePage({
        path: "guides/internal-rollout",
        title: "Internal rollout",
        frontmatter: { internal: true },
      }),
    ).toBe(false);
  });

  it("keeps internal pages out of generated docs navigation", () => {
    const nav = buildDocsNav([
      { id: "1", path: "introduction", title: "Introduction" },
      { id: "2", path: "ralph/qa-loop-prompt", title: "QA Loop Prompt" },
      { id: "3", path: "guides/getting-started", title: "Getting Started" },
    ]);

    expect(JSON.stringify(nav)).toContain("Introduction");
    expect(JSON.stringify(nav)).toContain("Getting Started");
    expect(JSON.stringify(nav)).not.toContain("QA Loop Prompt");
  });

  it("detects and suppresses broken generated badge images", () => {
    expect(isBrokenGeneratedBadge("repo not found", undefined)).toBe(true);
    expect(
      isBrokenGeneratedBadge(
        "Repo",
        "https://img.shields.io/badge/repo-not_found-red",
      ),
    ).toBe(true);
    expect(isBrokenGeneratedBadge("build passing", undefined)).toBe(false);

    const html = renderMdxContent(
      "![repo not found](https://img.shields.io/badge/repo-not%20found-red) ![build passing](https://img.shields.io/badge/build-passing-green)",
    );

    expect(html).not.toContain("repo not found");
    expect(html).toContain("build passing");
  });
});
