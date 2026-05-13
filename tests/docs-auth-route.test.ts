import {
  getDocsAccessCredential,
  normalizeDocsReturnTo,
} from "@/app/api/docs/[subdomain]/auth/route";
import { describe, expect, it } from "vitest";

describe("docs auth route", () => {
  it("uses the normalized stored credential when minting access cookies", () => {
    const legacyHash =
      "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";

    expect(
      getDocsAccessCredential(
        { authentication: { mode: "password", password: legacyHash } },
        "secret",
      ),
    ).toBe(legacyHash);
    expect(
      getDocsAccessCredential(
        {
          authentication: {
            mode: "password",
            password: "",
            passwordHash: "hashed-secret",
          },
        },
        "secret",
      ),
    ).toBe("hashed-secret");
  });

  it("allows same-site docs return paths", () => {
    expect(normalizeDocsReturnTo("/docs/acme/intro", "acme")).toBe(
      "/docs/acme/intro",
    );
  });

  it("falls back when returnTo points outside the docs site", () => {
    expect(normalizeDocsReturnTo("/settings", "acme")).toBe("/docs/acme");
    expect(normalizeDocsReturnTo("https://evil.test", "acme")).toBe(
      "/docs/acme",
    );
    expect(normalizeDocsReturnTo("//evil.test", "acme")).toBe("/docs/acme");
  });
});
