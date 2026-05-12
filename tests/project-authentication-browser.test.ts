import { describe, expect, it } from "vitest";

import {
  hashDocsPasswordForBrowser,
  mergeProjectAuthenticationSettings,
  readProjectAuthenticationSettings,
  validateProjectAuthenticationSettings,
} from "@/lib/project-authentication-browser";
import { verifyDocsPasswordHash } from "@/lib/project-authentication-settings";

describe("project authentication browser helpers", () => {
  it("hashes docs passwords without Node crypto and keeps them server-verifiable", async () => {
    const hash = await hashDocsPasswordForBrowser("secret");

    expect(hash).toBe(
      "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b",
    );
    expect(await verifyDocsPasswordHash(hash, "secret")).toBe(true);
    expect(await verifyDocsPasswordHash(hash, "wrong")).toBe(false);
  });

  it("keeps settings helper behavior aligned with the server module", () => {
    const settings = mergeProjectAuthenticationSettings(
      { theme: "dark" },
      { mode: "password", password: "", passwordHash: "hashed-secret" },
    );

    expect(settings).toEqual({
      theme: "dark",
      authentication: {
        mode: "password",
        password: "",
        passwordHash: "hashed-secret",
      },
    });
    expect(readProjectAuthenticationSettings(settings)).toEqual({
      mode: "password",
      password: "",
      passwordHash: "hashed-secret",
    });
    expect(
      validateProjectAuthenticationSettings({ mode: "password", password: "" }),
    ).toBe("Password protection requires a password.");
  });
});
