import { ACTIVE_PROJECT_COOKIE, findActiveProject } from "@/lib/active-project";
import { getBetterAuthUrl } from "@/lib/auth";
import { projectDisplayStatus } from "@/lib/dashboard";
import { db } from "@/lib/db";
import {
  deployments,
  orgMemberships,
  organizations,
  pages,
  projects,
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHomeClient } from "./dashboard-home-client";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Fetch org + project + deployments
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) redirect("/onboarding");

  const orgId = membership[0].orgId;

  const orgProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt);

  const activeProjectId = (await cookies()).get(ACTIVE_PROJECT_COOKIE)?.value;
  const project = findActiveProject(orgProjects, activeProjectId);

  type DeploymentRow = {
    id: string;
    status: string;
    branch: string | null;
    previewUrl: string | null;
    commitSha: string | null;
    commitMessage: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
  };

  let projectDeployments: DeploymentRow[] = [];
  let previewDeployments: DeploymentRow[] = [];
  let manualHandoffs: Array<{
    id: string;
    action: string;
    createdAt: string;
    details: Record<string, unknown>;
  }> = [];
  let resolvedManualHandoffs: Array<{
    id: string;
    action: string;
    createdAt: string;
    details: Record<string, unknown>;
  }> = [];
  let manualHandoffStats: {
    oldestUnresolvedMs?: number | null;
    averageResolutionMs?: number | null;
  } = {};
  let resolvedManualHandoffStats: {
    oldestUnresolvedMs?: number | null;
    averageResolutionMs?: number | null;
  } = {};
  let publishedPages: Array<{ id: string; path: string; title: string }> = [];
  let publishedPageCount = 0;

  if (project) {
    publishedPages = await db
      .select({ id: pages.id, path: pages.path, title: pages.title })
      .from(pages)
      .where(and(eq(pages.projectId, project.id), eq(pages.isPublished, true)))
      .orderBy(pages.path);
    publishedPageCount = publishedPages.length;

    projectDeployments = await db
      .select({
        id: deployments.id,
        status: deployments.status,
        branch: deployments.branch,
        previewUrl: deployments.previewUrl,
        commitSha: deployments.commitSha,
        commitMessage: deployments.commitMessage,
        startedAt: deployments.startedAt,
        endedAt: deployments.endedAt,
        createdAt: deployments.createdAt,
      })
      .from(deployments)
      .where(
        and(
          eq(deployments.projectId, project.id),
          eq(deployments.type, "production"),
        ),
      )
      .orderBy(desc(deployments.createdAt))
      .limit(20);

    previewDeployments = await db
      .select({
        id: deployments.id,
        status: deployments.status,
        branch: deployments.branch,
        previewUrl: deployments.previewUrl,
        commitSha: deployments.commitSha,
        commitMessage: deployments.commitMessage,
        startedAt: deployments.startedAt,
        endedAt: deployments.endedAt,
        createdAt: deployments.createdAt,
      })
      .from(deployments)
      .where(
        and(
          eq(deployments.projectId, project.id),
          eq(deployments.type, "preview"),
        ),
      )
      .orderBy(desc(deployments.createdAt))
      .limit(20);

    const cookieHeader = (await cookies()).toString();
    const authBaseUrl = getBetterAuthUrl();
    const [manualHandoffResponse, resolvedManualHandoffResponse] =
      await Promise.all([
        fetch(`${authBaseUrl}/api/analytics/manual-handoffs?limit=20`, {
          headers: {
            Cookie: cookieHeader,
          },
          cache: "no-store",
        }),
        fetch(
          `${authBaseUrl}/api/analytics/manual-handoffs?limit=20&includeResolved=true`,
          {
            headers: {
              Cookie: cookieHeader,
            },
            cache: "no-store",
          },
        ),
      ]);

    if (manualHandoffResponse.ok) {
      const data = (await manualHandoffResponse.json()) as {
        handoffs?: Array<{
          id: string;
          action: string;
          createdAt: string;
          details?: Record<string, unknown> | null;
        }>;
        stats?: {
          oldestUnresolvedMs?: number | null;
          averageResolutionMs?: number | null;
        };
      };

      manualHandoffStats = data.stats ?? {};
      manualHandoffs = (data.handoffs ?? []).map((row) => ({
        ...row,
        details: row.details ?? {},
      }));
    }

    if (resolvedManualHandoffResponse.ok) {
      const data = (await resolvedManualHandoffResponse.json()) as {
        handoffs?: Array<{
          id: string;
          action: string;
          createdAt: string;
          details?: Record<string, unknown> | null;
        }>;
        stats?: {
          oldestUnresolvedMs?: number | null;
          averageResolutionMs?: number | null;
        };
      };

      resolvedManualHandoffStats = data.stats ?? {};
      resolvedManualHandoffs = (data.handoffs ?? []).map((row) => ({
        ...row,
        details: row.details ?? {},
      }));
    }
  }

  return (
    <DashboardHomeClient
      greeting={greeting}
      firstName={firstName}
      project={
        project
          ? {
              id: project.id,
              name: project.name,
              subdomain: project.subdomain,
              status: projectDisplayStatus({
                projectStatus: project.status,
                publishedPageCount,
                latestDeploymentStatus: projectDeployments[0]?.status ?? null,
              }),
              customDomain: project.customDomain,
            }
          : null
      }
      deployments={projectDeployments.map((d) => ({
        ...d,
        startedAt: d.startedAt?.toISOString() ?? null,
        endedAt: d.endedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      }))}
      previews={previewDeployments.map((d) => ({
        ...d,
        startedAt: d.startedAt?.toISOString() ?? null,
        endedAt: d.endedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      }))}
      manualHandoffs={manualHandoffs}
      resolvedManualHandoffs={resolvedManualHandoffs}
      manualHandoffStats={manualHandoffStats}
      resolvedManualHandoffStats={resolvedManualHandoffStats}
      publishedPages={publishedPages}
    />
  );
}
