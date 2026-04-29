import { describe, expect, it } from "vitest";

import {
  mergeProjectAuthenticationSettings,
  readProjectAuthenticationSettings,
  validateProjectAuthenticationSettings,
} from "@/lib/project-authentication-settings";
import {
  createDocsAccessToken,
  hasValidDocsAccess,
  isValidDocsPassword,
} from "@/lib/project-docs-access";
import { isProjectPasswordProtected } from "@/lib/project-publication-auth";

describe("project authentication settings", () => {
  it("defaults to public authentication", () => {
    expect(readProjectAuthenticationSettings(null)).toEqual({
      mode: "public",
      password: "",
      passwordHash: "",
    });
  });

  it("reads password authentication from project settings", () => {
    expect(
      readProjectAuthenticationSettings({
        authentication: {
          mode: "password",
          password: "",
          passwordHash: "hashed-secret",
        },
      }),
    ).toEqual({
      mode: "password",
      password: "",
      passwordHash: "hashed-secret",
    });
  });

  it("merges authentication without dropping other settings", () => {
    expect(
      mergeProjectAuthenticationSettings(
        { theme: "dark" },
        { mode: "password", password: "", passwordHash: "hashed-secret" },
      ),
    ).toEqual({
      theme: "dark",
      authentication: {
        mode: "password",
        password: "",
        passwordHash: "hashed-secret",
      },
    });
  });

  it("clears passwords when switching back to public", () => {
    expect(
      mergeProjectAuthenticationSettings(
        { authentication: { mode: "password", password: "secret" } },
        { mode: "public", password: "secret", passwordHash: "" },
      ),
    ).toEqual({
      authentication: { mode: "public", password: "", passwordHash: "" },
    });
  });

  it("requires a password for password protection", () => {
    expect(
      validateProjectAuthenticationSettings({ mode: "password", password: "" }),
    ).toBe("Password protection requires a password.");
  });

  it("validates docs access passwords and cookies", async () => {
    const settings = {
      authentication: { mode: "password", password: "secret" },
    };
    expect(await isValidDocsPassword(settings, "secret")).toBe(true);
    expect(await isValidDocsPassword(settings, "wrong")).toBe(false);
    expect(hasValidDocsAccess(settings, "docs", undefined)).toBe(false);
    expect(
      hasValidDocsAccess(
        settings,
        "docs",
        createDocsAccessToken("docs", "secret"),
      ),
    ).toBe(true);
    expect(
      hasValidDocsAccess(
        { authentication: { mode: "public" } },
        "docs",
        undefined,
      ),
    ).toBe(true);
  });

  it("detects password-protected published docs settings", () => {
    expect(
      isProjectPasswordProtected({
        authentication: { mode: "password", password: "secret" },
      }),
    ).toBe(true);
    expect(
      isProjectPasswordProtected({
        authentication: { mode: "public", password: "", passwordHash: "" },
      }),
    ).toBe(false);
    expect(isProjectPasswordProtected({ requireAuth: true })).toBe(false);
  });
});
