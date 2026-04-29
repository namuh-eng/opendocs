import { describe, expect, it, vi } from "vitest";

import {
  buildProjectExport,
  buildProjectExportFilename,
} from "@/lib/project-export";

describe("project export helpers", () => {
  it("builds a portable project export payload", () => {
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));

    expect(
      buildProjectExport({
        id: "project-1",
        name: "Docs",
        slug: "docs",
        subdomain: "docs",
        customDomain: "docs.example.com",
        repoUrl: "https://github.com/acme/docs",
        repoBranch: null,
        repoPath: null,
        settings: { theme: "dark" },
      }),
    ).toEqual({
      exportedAt: "2026-04-28T12:00:00.000Z",
      project: {
        id: "project-1",
        name: "Docs",
        slug: "docs",
        subdomain: "docs",
        customDomain: "docs.example.com",
        repository: {
          url: "https://github.com/acme/docs",
          branch: "main",
          path: "/",
        },
        settings: { theme: "dark" },
      },
    });

    vi.useRealTimers();
  });

  it("redacts authentication passwords from exported settings", () => {
    const exported = buildProjectExport({
      id: "project-1",
      name: "Docs",
      slug: "docs",
      subdomain: "docs",
      customDomain: null,
      repoUrl: null,
      repoBranch: null,
      repoPath: null,
      settings: {
        authentication: { mode: "password", password: "super-secret" },
      },
    });

    expect(exported.project.settings).toEqual({
      authentication: { mode: "password", password: "" },
    });
  });

  it("sanitizes export filenames", () => {
    expect(buildProjectExportFilename({ slug: "My Docs!" })).toBe(
      "my-docs--export.json",
    );
  });
});
