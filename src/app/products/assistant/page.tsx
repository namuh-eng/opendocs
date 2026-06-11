import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  assistantSettings,
  assistantUsage,
  orgMemberships,
  projects,
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { AssistantSettingsClient } from "./assistant-settings-client";

export default async function AssistantPage({
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

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  if (projectRows.length === 0) redirect("/onboarding");

  const project = projectRows[0];

  // Fetch assistant settings
  const settingsRows = await db
    .select()
    .from(assistantSettings)
    .where(eq(assistantSettings.projectId, project.id))
    .limit(1);

  const s = settingsRows[0];
  const initialSettings = s
    ? {
        enabled: s.enabled,
        deflectionEnabled: s.deflectionEnabled,
        deflectionEmail: s.deflectionEmail ?? null,
        showHelpButton: s.showHelpButton,
        searchDomainsEnabled: s.searchDomainsEnabled,
        searchDomains: (s.searchDomains as string[] | null) ?? [],
        starterQuestionsEnabled: s.starterQuestionsEnabled,
        starterQuestions: (s.starterQuestions as string[] | null) ?? [],
      }
    : {
        enabled: false,
        deflectionEnabled: false,
        deflectionEmail: null,
        showHelpButton: false,
        searchDomainsEnabled: false,
        searchDomains: [] as string[],
        starterQuestionsEnabled: false,
        starterQuestions: [] as string[],
      };

  // Fetch usage
  const usageRows = await db
    .select()
    .from(assistantUsage)
    .where(eq(assistantUsage.projectId, project.id))
    .limit(1);

  const u = usageRows[0];
  const initialUsage = u
    ? {
        messagesUsed: u.messagesUsed,
        messageLimit: u.messageLimit,
        billingCycleStart: u.billingCycleStart?.toISOString() ?? null,
        billingCycleEnd: u.billingCycleEnd?.toISOString() ?? null,
        monthlyPrice: u.monthlyPrice,
        overageSpend: u.overageSpend,
      }
    : {
        messagesUsed: 0,
        messageLimit: 250,
        billingCycleStart: null,
        billingCycleEnd: null,
        monthlyPrice: 0,
        overageSpend: 0,
      };

  const params = await searchParams;
  const tab = params.tab === "billing" ? "billing" : "general";

  return (
    <AssistantSettingsClient
      initialSettings={initialSettings}
      initialUsage={initialUsage}
      initialTab={tab}
    />
  );
}
