import { buildDocsEntryProjects } from "@/lib/docs-entry";
import { describe, expect, it } from "vitest";

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
});
