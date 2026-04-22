import { ACTIVE_PROJECT_COOKIE, findActiveProject } from "@/lib/active-project";
import { db } from "@/lib/db";
import {
  auditLogs,
  deployments,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { and, desc, eq, inArray } from "drizzle-orm";
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
    createdAt: Date;
    details: Record<string, unknown>;
  }> = [];

  if (project) {
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

    const rawManualHandoffs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        createdAt: auditLogs.createdAt,
        details: auditLogs.details,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.orgId, orgId),
          inArray(auditLogs.action, [
            "agent_job_manual_handoff_required",
            "deployment_manual_handoff_required",
            "project_initial_deployment_manual_handoff_required",
            "preview_deployment_manual_handoff_required",
            "api_v1_agent_job_manual_handoff_required",
            "api_v1_deployment_manual_handoff_required",
          ]),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(5);

    manualHandoffs = rawManualHandoffs.map((row) => ({
      ...row,
      details: row.details ?? {},
    }));
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
              status: project.status,
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
      manualHandoffs={manualHandoffs.map((row) => ({
        ...row,
        details: row.details ?? {},
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
