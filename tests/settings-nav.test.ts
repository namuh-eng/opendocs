import {
  ALL_SETTINGS_ITEMS,
  SETTINGS_DEFAULT_HREF,
  SETTINGS_NAV,
  findActiveSettingsItem,
  isActiveSettingsItem,
} from "@/lib/settings-nav";
import { describe, expect, it } from "vitest";

describe("settings-nav", () => {
  describe("SETTINGS_NAV structure", () => {
    it("has 5 navigation groups", () => {
      expect(SETTINGS_NAV).toHaveLength(5);
    });

    it("groups have correct headings in order", () => {
      const headings = SETTINGS_NAV.map((g) => g.heading);
      expect(headings).toEqual([
        "Project Settings",
        "Deployment",
        "Security & Access",
        "Workspace",
        "Advanced",
      ]);
    });

    it("every item has label, href, and icon", () => {
      for (const group of SETTINGS_NAV) {
        for (const item of group.items) {
          expect(item.label).toBeTruthy();
          expect(item.href).toMatch(/^\/settings\//);
          expect(item.icon).toBeDefined();
        }
      }
    });

    it("all hrefs are unique", () => {
      const hrefs = ALL_SETTINGS_ITEMS.map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    });

    it("Project Settings has 4 items", () => {
      const group = SETTINGS_NAV.find((g) => g.heading === "Project Settings");
      expect(group?.items).toHaveLength(4);
    });

    it("Deployment has 2 items", () => {
      const group = SETTINGS_NAV.find((g) => g.heading === "Deployment");
      expect(group?.items).toHaveLength(2);
    });

    it("Security & Access has 1 item", () => {
      const group = SETTINGS_NAV.find((g) => g.heading === "Security & Access");
      expect(group?.items).toHaveLength(1);
    });

    it("Workspace has 3 items including billing", () => {
      const group = SETTINGS_NAV.find((g) => g.heading === "Workspace");
      expect(group?.items).toHaveLength(3);
      expect(group?.items.map((item) => item.href)).toContain(
        "/settings/organization/billing",
      );
    });

    it("Advanced has 2 items", () => {
      const group = SETTINGS_NAV.find((g) => g.heading === "Advanced");
      expect(group?.items).toHaveLength(2);
    });
  });

  describe("ALL_SETTINGS_ITEMS", () => {
    it("flattens all items from all groups", () => {
      const expectedCount = SETTINGS_NAV.reduce(
        (sum, g) => sum + g.items.length,
        0,
      );
      expect(ALL_SETTINGS_ITEMS).toHaveLength(expectedCount);
    });
  });

  describe("SETTINGS_DEFAULT_HREF", () => {
    it("points to project general settings", () => {
      expect(SETTINGS_DEFAULT_HREF).toBe("/settings/project/general");
    });
  });

  describe("isActiveSettingsItem", () => {
    it("returns true for exact match", () => {
      expect(
        isActiveSettingsItem(
          "/settings/project/general",
          "/settings/project/general",
        ),
      ).toBe(true);
    });

    it("returns true for sub-path match", () => {
      expect(
        isActiveSettingsItem(
          "/settings/project/general/advanced",
          "/settings/project/general",
        ),
      ).toBe(true);
    });

    it("returns false for non-matching path", () => {
      expect(
        isActiveSettingsItem(
          "/settings/deployment/git",
          "/settings/project/general",
        ),
      ).toBe(false);
    });

    it("returns false for partial prefix that is not a sub-path", () => {
      expect(
        isActiveSettingsItem(
          "/settings/project/generalsomething",
          "/settings/project/general",
        ),
      ).toBe(false);
    });
  });

  describe("findActiveSettingsItem", () => {
    it("finds matching item for exact path", () => {
      const item = findActiveSettingsItem("/settings/security/api-keys");
      expect(item).not.toBeNull();
      expect(item?.label).toBe("API keys");
    });

    it("finds matching item for sub-path", () => {
      const item = findActiveSettingsItem("/settings/workspace/members/invite");
      expect(item).not.toBeNull();
      expect(item?.label).toBe("Members");
    });

    it("returns null for unknown path", () => {
      expect(findActiveSettingsItem("/settings/unknown")).toBeNull();
    });

    it("returns null for non-settings path", () => {
      expect(findActiveSettingsItem("/dashboard")).toBeNull();
    });
  });
});
