import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { McpPageClient } from "./mcp-page-client";

export default async function McpPage() {
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
    .select({ slug: projects.slug, subdomain: projects.subdomain })
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  const projectSlug =
    projectRows[0]?.subdomain ?? projectRows[0]?.slug ?? "my-project";

  return <McpPageClient projectSlug={projectSlug} />;
}
