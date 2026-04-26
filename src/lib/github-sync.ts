import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { importGitHubDocs } from "@/lib/github-docs-import";
import { resolveGitHubImportAccess } from "@/lib/github-import";
import { buildGitHubInstallationAuthHeaders } from "@/lib/github-installation-auth";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";

export interface SyncDocsResult {
  ok: boolean;
  message: string;
  importedPageCount?: number;
}

/**
 * syncProjectDocsFromGitHub
 *
 * Core logic to fetch markdown from GitHub and update the local database.
 * Re-uses the established import and auth patterns.
 */
export async function syncProjectDocsFromGitHub(params: {
  projectId: string;
  orgId: string;
  requestId?: string;
}): Promise<SyncDocsResult> {
  const requestId = params.requestId ?? createRequestId();
  const { projectId, orgId } = params;

  // 1. Fetch project details
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);

  if (!project) {
    return { ok: false, message: "Project not found" };
  }

  if (!project.repoUrl) {
    return { ok: false, message: "Project has no GitHub repository linked" };
  }

  // 2. Resolve access
  const importAccess = await resolveGitHubImportAccess({
    orgId,
    repoUrl: project.repoUrl,
    repoBranch: project.repoBranch,
    repoPath: project.repoPath,
    settings: project.settings,
  });

  // 3. Prepare headers (if connected)
  let headers: HeadersInit | undefined;
  if (importAccess.status === "private_connected") {
    const installationId = (
      project.settings?.githubSource as { installationId?: string } | undefined
    )?.installationId;

    if (installationId) {
      try {
        headers = await buildGitHubInstallationAuthHeaders({ installationId });
      } catch (err) {
        logger.error("sync_docs_auth_failed", { requestId, projectId, err });
        // Continue without headers; if it's actually private, importGitHubDocs will fail gracefully
      }
    }
  }

  // 4. Run import
  const importResult = await importGitHubDocs({
    repoUrl: project.repoUrl,
    repoBranch: project.repoBranch,
    repoPath: project.repoPath,
    headers,
  });

  if (!importResult.ok) {
    return { ok: false, message: importResult.message };
  }

  // 5. Atomic update: delete old pages and insert new ones
  // Note: For now we overwrite everything to ensure the site matches the repo source of truth.
  // In the future, we could do a diffing sync to preserve comments/history if path-stable.
  await db.transaction(async (tx) => {
    // Delete existing pages for this project
    await tx.delete(pages).where(eq(pages.projectId, projectId));

    // Insert newly imported pages
    if (importResult.pages.length > 0) {
      await tx.insert(pages).values(
        importResult.pages.map((page) => ({
          projectId,
          path: page.path,
          title: page.title,
          content: page.content,
          isPublished: true,
        })),
      );
    }
  });

  logger.info("sync_docs_completed", {
    requestId,
    projectId,
    orgId,
    pageCount: importResult.pages.length,
  });

  return {
    ok: true,
    message: `Successfully imported ${importResult.pages.length} pages from GitHub.`,
    importedPageCount: importResult.pages.length,
  };
}
