export interface ExportableProject {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  repoUrl: string | null;
  repoBranch: string | null;
  repoPath: string | null;
  settings: Record<string, unknown> | null;
}

export function buildProjectExport(project: ExportableProject) {
  return {
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      subdomain: project.subdomain,
      customDomain: project.customDomain,
      repository: {
        url: project.repoUrl,
        branch: project.repoBranch ?? "main",
        path: project.repoPath ?? "/",
      },
      settings: project.settings ?? {},
    },
  };
}

export function buildProjectExportFilename(
  project: Pick<ExportableProject, "slug">,
) {
  const safeSlug = project.slug.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  return `${safeSlug || "project"}-export.json`;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
