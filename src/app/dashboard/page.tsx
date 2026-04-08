import { db } from "@/lib/db";
import {
  deployments,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { and, desc, eq } from "drizzle-orm";
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
    .orderBy(projects.createdAt)
    .limit(1);

  const project = orgProjects[0] ?? null;

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
    />
  );
}
