import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { githubConnections, orgMemberships, projects } from "@/lib/db/schema";
import { resolveGitHubAppInstallUrl } from "@/lib/github-app-install";
import { attachResolvedGitHubSource } from "@/lib/project-response";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GitHubAppSettingsClient } from "./github-app-client";

export default async function GitHubAppSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const membership = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) redirect("/");

  const orgId = membership[0].orgId;

  const [connections, orgProjects] = await Promise.all([
    db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.orgId, orgId)),
    db
      .select({
        repoUrl: projects.repoUrl,
        repoBranch: projects.repoBranch,
        repoPath: projects.repoPath,
        settings: projects.settings,
      })
      .from(projects)
      .where(eq(projects.orgId, orgId)),
  ]);

  const selectedSource =
    orgProjects
      .map((project) => attachResolvedGitHubSource(project).githubSource)
      .find((source) => Boolean(source?.repoFullName)) ?? null;

  return (
    <GitHubAppSettingsClient
      initialConnections={connections.map((c) => ({
        id: c.id,
        installationId: c.installationId,
        repos: (c.repos ?? []) as Array<{
          fullName: string;
          branch: string;
          permissions: string;
        }>,
        autoUpdateEnabled: c.autoUpdateEnabled,
        createdAt: c.createdAt.toISOString(),
      }))}
      isAdmin={
        membership[0].role === "admin" || membership[0].role === "editor"
      }
      selectedRepoFullName={selectedSource?.repoFullName ?? null}
      selectedSource={selectedSource}
      installUrl={resolveGitHubAppInstallUrl()}
    />
  );
}
