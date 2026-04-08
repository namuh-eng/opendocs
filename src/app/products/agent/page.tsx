import { db } from "@/lib/db";
import {
  agentJobs,
  agentSettings,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AgentPageClient } from "./agent-page-client";
import { AgentSettingsClient } from "./agent-settings-client";

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) redirect("/onboarding");

  const orgId = membership[0].orgId;

  // Fetch org plan
  const orgRows = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const plan = orgRows[0]?.plan ?? "free";

  // Fetch agent settings
  const settingsRows = await db
    .select()
    .from(agentSettings)
    .where(eq(agentSettings.orgId, orgId))
    .limit(1);

  const settings = settingsRows[0];
  const initialSettings = settings
    ? {
        agentEnabled: settings.agentEnabled,
        slackConnected: settings.slackConnected,
        slackWorkspace: settings.slackWorkspace,
        githubAppInstalled: settings.githubAppInstalled,
        connectedRepos: settings.connectedRepos ?? [],
      }
    : {
        agentEnabled: false,
        slackConnected: false,
        slackWorkspace: null,
        githubAppInstalled: false,
        connectedRepos: [],
      };

  const params = await searchParams;
  const tab = params.tab === "jobs" ? "jobs" : "settings";

  if (tab === "jobs") {
    const projectRows = await db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(projects.createdAt)
      .limit(1);

    const project = projectRows[0] ?? null;

    let jobs: Array<{
      id: string;
      prompt: string;
      status: string;
      prUrl: string | null;
      createdAt: string;
      updatedAt: string;
    }> = [];

    if (project) {
      const rows = await db
        .select()
        .from(agentJobs)
        .where(eq(agentJobs.projectId, project.id))
        .orderBy(desc(agentJobs.createdAt))
        .limit(50);

      jobs = rows.map((j) => ({
        id: j.id,
        prompt: j.prompt,
        status: j.status,
        prUrl: j.prUrl,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      }));
    }

    return <AgentPageClient hasProject={project !== null} initialJobs={jobs} />;
  }

  return (
    <AgentSettingsClient initialPlan={plan} initialSettings={initialSettings} />
  );
}
