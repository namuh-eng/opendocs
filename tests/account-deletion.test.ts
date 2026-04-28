import { describe, expect, it } from "vitest";

import { findSoleAdminOrgIdsForDeletion } from "@/lib/account-deletion";

describe("account deletion organization cleanup", () => {
  it("deletes organizations where the user is the only admin/member", () => {
    expect(
      findSoleAdminOrgIdsForDeletion(
        [
          { orgId: "solo-admin-org", role: "admin" },
          { orgId: "shared-admin-org", role: "admin" },
        ],
        new Set(["shared-admin-org"]),
      ),
    ).toEqual(["solo-admin-org"]);
  });

  it("does not delete organizations where the user is not an admin", () => {
    expect(
      findSoleAdminOrgIdsForDeletion(
        [
          { orgId: "viewer-org", role: "viewer" },
          { orgId: "editor-org", role: "editor" },
        ],
        new Set(),
      ),
    ).toEqual([]);
  });

  it("does not delete organizations that still have other members", () => {
    expect(
      findSoleAdminOrgIdsForDeletion(
        [{ orgId: "shared-admin-org", role: "admin" }],
        new Set(["shared-admin-org"]),
      ),
    ).toEqual([]);
  });
});
