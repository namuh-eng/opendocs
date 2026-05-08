export interface DocsEntryRow {
  projectId: string;
  projectName: string;
  subdomain: string | null;
  pagePath: string;
  pageTitle: string;
  pageDescription: string | null;
}

export interface DocsEntryProject {
  id: string;
  name: string;
  subdomain: string;
  href: string;
  pageTitle: string;
  pageDescription: string | null;
}

function pagePriority(path: string): number {
  if (path === "introduction") return 0;
  if (path === "getting-started") return 1;
  if (path === "quickstart") return 2;
  return 3;
}

function docsHref(subdomain: string, pagePath: string): string {
  return `/docs/${subdomain}/${pagePath.replace(/^\/+/, "")}`;
}

export function buildDocsEntryProjects(
  rows: DocsEntryRow[],
): DocsEntryProject[] {
  const projects = new Map<
    string,
    DocsEntryProject & { selectedPriority: number }
  >();

  for (const row of rows) {
    if (!row.subdomain || !row.pagePath) continue;

    const candidate = {
      id: row.projectId,
      name: row.projectName,
      subdomain: row.subdomain,
      href: docsHref(row.subdomain, row.pagePath),
      pageTitle: row.pageTitle,
      pageDescription: row.pageDescription,
      selectedPriority: pagePriority(row.pagePath),
    };

    const existing = projects.get(row.projectId);
    if (!existing || candidate.selectedPriority < existing.selectedPriority) {
      projects.set(row.projectId, candidate);
    }
  }

  return Array.from(projects.values()).map(
    ({ selectedPriority: _, ...p }) => p,
  );
}
