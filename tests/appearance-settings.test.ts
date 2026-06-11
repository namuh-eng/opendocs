import { describe, expect, it } from "vitest";
import {
  type AppearanceSettings,
  buildAssetFilename,
  DEFAULT_APPEARANCE,
  isValidHexColor,
  mergeAppearance,
  validateAppearance,
} from "@/lib/appearance";

describe("Appearance Settings", () => {
  describe("isValidHexColor", () => {
    it("accepts valid 6-digit hex colors", () => {
      expect(isValidHexColor("#16A34A")).toBe(true);
      expect(isValidHexColor("#000000")).toBe(true);
      expect(isValidHexColor("#FFFFFF")).toBe(true);
      expect(isValidHexColor("#ff5733")).toBe(true);
    });

    it("rejects invalid hex colors", () => {
      expect(isValidHexColor("")).toBe(false);
      expect(isValidHexColor("#FFF")).toBe(false);
      expect(isValidHexColor("16A34A")).toBe(false);
      expect(isValidHexColor("#GGGGGG")).toBe(false);
      expect(isValidHexColor("#12345")).toBe(false);
      expect(isValidHexColor("red")).toBe(false);
    });
  });

  describe("mergeAppearance", () => {
    it("returns defaults when given empty object", () => {
      expect(mergeAppearance({})).toEqual(DEFAULT_APPEARANCE);
    });

    it("overrides only provided fields", () => {
      const result = mergeAppearance({ primaryColor: "#FF0000" });
      expect(result.primaryColor).toBe("#FF0000");
      expect(result.backgroundColor).toBe("#FFFFFF");
      expect(result.darkMode).toBe("system");
      expect(result.logoLight).toBeNull();
    });

    it("preserves all fields when fully provided", () => {
      const full: AppearanceSettings = {
        primaryColor: "#FF0000",
        backgroundColor: "#000000",
        darkMode: "dark",
        logoLight: "org/proj/assets/logo-light.png",
        logoDark: "org/proj/assets/logo-dark.png",
        favicon: "org/proj/assets/favicon.ico",
      };
      expect(mergeAppearance(full)).toEqual(full);
    });
  });

  describe("validateAppearance", () => {
    it("accepts valid settings", () => {
      const result = validateAppearance({
        primaryColor: "#16A34A",
        backgroundColor: "#FFFFFF",
        darkMode: "dark",
      });
      expect(result.valid).toBe(true);
    });

    it("accepts empty/partial settings", () => {
      expect(validateAppearance({}).valid).toBe(true);
      expect(validateAppearance({ darkMode: "light" }).valid).toBe(true);
    });

    it("rejects invalid primary color", () => {
      const result = validateAppearance({ primaryColor: "not-a-color" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("primary color");
      }
    });

    it("rejects invalid background color", () => {
      const result = validateAppearance({ backgroundColor: "#GGG" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("background color");
      }
    });

    it("rejects invalid dark mode value", () => {
      const result = validateAppearance({
        darkMode: "auto" as AppearanceSettings["darkMode"],
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("Dark mode");
      }
    });
  });

  describe("buildAssetFilename", () => {
    it("builds logo-light filename with correct extension", () => {
      expect(buildAssetFilename("logo-light", "my-logo.png")).toBe(
        "logo-light.png",
      );
      expect(buildAssetFilename("logo-light", "brand.svg")).toBe(
        "logo-light.svg",
      );
    });

    it("builds logo-dark filename", () => {
      expect(buildAssetFilename("logo-dark", "dark.webp")).toBe(
        "logo-dark.webp",
      );
    });

    it("builds favicon filename", () => {
      expect(buildAssetFilename("favicon", "icon.ico")).toBe("favicon.ico");
      expect(buildAssetFilename("favicon", "fav.png")).toBe("favicon.png");
    });

    it("defaults to png when no extension", () => {
      expect(buildAssetFilename("favicon", "noext")).toBe("favicon.noext");
    });
  });

  describe("DEFAULT_APPEARANCE", () => {
    it("has expected default values", () => {
      expect(DEFAULT_APPEARANCE.primaryColor).toBe("#16A34A");
      expect(DEFAULT_APPEARANCE.backgroundColor).toBe("#FFFFFF");
      expect(DEFAULT_APPEARANCE.darkMode).toBe("system");
      expect(DEFAULT_APPEARANCE.logoLight).toBeNull();
      expect(DEFAULT_APPEARANCE.logoDark).toBeNull();
      expect(DEFAULT_APPEARANCE.favicon).toBeNull();
    });
  });
});
