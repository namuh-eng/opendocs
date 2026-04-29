import { describe, expect, it } from "vitest";

import {
  mergeProjectAuthenticationSettings,
  readProjectAuthenticationSettings,
  validateProjectAuthenticationSettings,
} from "@/lib/project-authentication-settings";
import { isProjectPasswordProtected } from "@/lib/project-publication-auth";

describe("project authentication settings", () => {
  it("defaults to public authentication", () => {
    expect(readProjectAuthenticationSettings(null)).toEqual({
      mode: "public",
      password: "",
    });
  });

  it("reads password authentication from project settings", () => {
    expect(
      readProjectAuthenticationSettings({
        authentication: { mode: "password", password: "secret" },
      }),
    ).toEqual({ mode: "password", password: "secret" });
  });

  it("merges authentication without dropping other settings", () => {
    expect(
      mergeProjectAuthenticationSettings(
        { theme: "dark" },
        { mode: "password", password: "secret" },
      ),
    ).toEqual({
      theme: "dark",
      authentication: { mode: "password", password: "secret" },
    });
  });

  it("clears passwords when switching back to public", () => {
    expect(
      mergeProjectAuthenticationSettings(
        { authentication: { mode: "password", password: "secret" } },
        { mode: "public", password: "secret" },
      ),
    ).toEqual({
      authentication: { mode: "public", password: "" },
    });
  });

  it("requires a password for password protection", () => {
    expect(
      validateProjectAuthenticationSettings({ mode: "password", password: "" }),
    ).toBe("Password protection requires a password.");
  });

  it("detects password-protected published docs settings", () => {
    expect(
      isProjectPasswordProtected({
        authentication: { mode: "password", password: "secret" },
      }),
    ).toBe(true);
    expect(
      isProjectPasswordProtected({
        authentication: { mode: "public", password: "" },
      }),
    ).toBe(false);
    expect(isProjectPasswordProtected({ requireAuth: true })).toBe(false);
  });
});
