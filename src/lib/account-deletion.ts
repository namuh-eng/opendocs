import { db } from "@/lib/db";
import { orgMemberships, organizations } from "@/lib/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";

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

type AccountDeletionDb = Pick<typeof db, "delete" | "select">;

export async function deleteOrganizationsSolelyAdministeredByUser(
  userId: string,
  database: AccountDeletionDb = db,
): Promise<string[]> {
  const memberships = await database
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId));

  if (memberships.length === 0) {
    return [];
  }

  const orgIdsWithOtherMembers = new Set<string>();

  await Promise.all(
    memberships.map(async ({ orgId }) => {
      const otherMembers = await database
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

  if (orgIdsToDelete.length > 0) {
    await database
      .delete(organizations)
      .where(inArray(organizations.id, orgIdsToDelete));
  }

  return orgIdsToDelete;
}
