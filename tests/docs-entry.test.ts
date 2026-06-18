import { describe, expect, it } from "vitest";
import { buildDocsEntryProjects } from "@/lib/docs-entry";

describe("buildDocsEntryProjects", () => {
  it("selects introduction as the preferred public entry point", () => {
    expect(
      buildDocsEntryProjects([
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "quickstart",
          pageTitle: "Quickstart",
          pageDescription: null,
        },
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "introduction",
          pageTitle: "Introduction",
          pageDescription: "Start here",
        },
      ]),
    ).toEqual([
      {
        id: "project-1",
        name: "Test Project",
        subdomain: "test-project",
        href: "/docs/test-project/introduction",
        pageTitle: "Introduction",
        pageDescription: "Start here",
      },
    ]);
  });

  it("omits projects without a public docs subdomain", () => {
    expect(
      buildDocsEntryProjects([
        {
          projectId: "project-1",
          projectName: "Private Project",
          subdomain: null,
          pagePath: "introduction",
          pageTitle: "Introduction",
          pageDescription: null,
        },
      ]),
    ).toEqual([]);
  });

  it("skips internal generated docs when selecting public entry cards", () => {
    expect(
      buildDocsEntryProjects([
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "ralph/build-loop-prompt",
          pageTitle: "Build Loop Prompt",
          pageDescription: null,
        },
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "quickstart",
          pageTitle: "Quickstart",
          pageDescription: "Start here",
        },
      ]),
    ).toEqual([
      {
        id: "project-1",
        name: "Test Project",
        subdomain: "test-project",
        href: "/docs/test-project/quickstart",
        pageTitle: "Quickstart",
        pageDescription: "Start here",
      },
    ]);
  });
});
