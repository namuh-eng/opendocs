import { db } from "@/lib/db";
import { orgMemberships, organizations } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";

interface MembershipRow {
  orgId: string;
  role: string;
}

export function findSoleAdminOrgIdsForDeletion(
  memberships: MembershipRow[],
  orgIdsWithOtherMembers: Set<string>,
): string[] {
  return memberships
    .filter(
      (membership) =>
        membership.role === "admin" &&
        !orgIdsWithOtherMembers.has(membership.orgId),
    )
    .map((membership) => membership.orgId);
}

export async function deleteOrganizationsSolelyAdministeredByUser(
  userId: string,
): Promise<string[]> {
  const memberships = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId));

  if (memberships.length === 0) {
    return [];
  }

  const orgIdsWithOtherMembers = new Set<string>();

  await Promise.all(
    memberships.map(async ({ orgId }) => {
      const otherMembers = await db
        .select({ id: orgMemberships.id })
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.orgId, orgId),
            ne(orgMemberships.userId, userId),
          ),
        )
        .limit(1);

      if (otherMembers.length > 0) {
        orgIdsWithOtherMembers.add(orgId);
      }
    }),
  );

  const orgIdsToDelete = findSoleAdminOrgIdsForDeletion(
    memberships,
    orgIdsWithOtherMembers,
  );

  await Promise.all(
    orgIdsToDelete.map((orgId) =>
      db.delete(organizations).where(eq(organizations.id, orgId)),
    ),
  );

  return orgIdsToDelete;
}
