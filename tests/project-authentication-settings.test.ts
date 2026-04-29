import { describe, expect, it, vi } from "vitest";

import {
  hashDocsPassword,
  mergeProjectAuthenticationSettings,
  readProjectAuthenticationSettings,
  validateProjectAuthenticationSettings,
  verifyDocsPasswordHash,
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

  it("hashes docs passwords with scrypt and verifies them", async () => {
    const hash = await hashDocsPassword("secret");

    expect(hash).toMatch(/^scrypt:v1:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(await verifyDocsPasswordHash(hash, "secret")).toBe(true);
    expect(await verifyDocsPasswordHash(hash, "wrong")).toBe(false);
  });

  it("keeps legacy SHA-256 password hashes verifiable", async () => {
    const legacyHash =
      "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";

    expect(await verifyDocsPasswordHash(legacyHash, "secret")).toBe(true);
    expect(await verifyDocsPasswordHash(legacyHash, "wrong")).toBe(false);
  });

  it("validates docs access passwords and cookies", async () => {
    const settings = {
      authentication: {
        mode: "password",
        password: "",
        passwordHash: await hashDocsPassword("secret"),
      },
    };
    expect(await isValidDocsPassword(settings, "secret")).toBe(true);
    expect(await isValidDocsPassword(settings, "wrong")).toBe(false);
    expect(hasValidDocsAccess(settings, "docs", undefined)).toBe(false);
    expect(
      hasValidDocsAccess(
        settings,
        "docs",
        createDocsAccessToken(
          "docs",
          readProjectAuthenticationSettings(settings).passwordHash ?? "",
        ),
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

describe("docs access token production secret", () => {
  it("fails closed in production when BETTER_AUTH_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "");

    try {
      expect(() => createDocsAccessToken("docs", "secret")).toThrow(
        "BETTER_AUTH_SECRET is required",
      );
      expect(
        hasValidDocsAccess(
          { authentication: { mode: "password", password: "secret" } },
          "docs",
          "forged-token",
        ),
      ).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
