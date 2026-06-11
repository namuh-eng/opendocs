import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, orgMemberships } from "@/lib/db/schema";

export async function getUserOrg(userId: string) {
  const memberships = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      org: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
      },
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (memberships.length === 0) return null;
  return { ...memberships[0].org, role: memberships[0].role };
}
