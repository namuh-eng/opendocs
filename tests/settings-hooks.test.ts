import {
  putProjectUpdate,
  selectActiveProject,
} from "@/hooks/project-hooks-core";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("project hooks core", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selectActiveProject prefers stored active project id", () => {
    expect(
      selectActiveProject({
        projects: [
          { id: "project-1", name: "One" },
          { id: "project-2", name: "Two" },
        ],
        activeProjectId: "project-2",
      }),
    ).toEqual({ id: "project-2", name: "Two" });
  });

  it("selectActiveProject falls back to first project", () => {
    expect(
      selectActiveProject({
        projects: [
          { id: "project-1", name: "One" },
          { id: "project-2", name: "Two" },
        ],
        activeProjectId: "missing",
      }),
    ).toEqual({ id: "project-1", name: "One" });
  });

  it("putProjectUpdate returns updated project on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          project: { id: "project-1", name: "Updated" },
        }),
      }),
    );

    await expect(
      putProjectUpdate<{ id: string; name: string }>({
        projectId: "project-1",
        body: { name: "Updated" },
      }),
    ).resolves.toEqual({
      ok: true,
      data: { project: { id: "project-1", name: "Updated" } },
    });
  });

  it("putProjectUpdate returns API error on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Nope" }),
      }),
    );

    await expect(
      putProjectUpdate({
        projectId: "project-1",
        body: { name: "Updated" },
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Nope",
      data: { error: "Nope" },
    });
  });
});
