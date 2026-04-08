import {
  domainVerificationStatus,
  generateCnameTarget,
  validateCustomDomain,
} from "@/lib/domains";
import { describe, expect, it } from "vitest";

describe("validateCustomDomain", () => {
  it("accepts a valid domain", () => {
    expect(validateCustomDomain("docs.example.com")).toBeNull();
  });

  it("accepts a bare domain", () => {
    expect(validateCustomDomain("example.com")).toBeNull();
  });

  it("accepts deeply nested subdomains", () => {
    expect(validateCustomDomain("a.b.c.example.com")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateCustomDomain("")).toBe("Domain is required");
  });

  it("rejects whitespace only", () => {
    expect(validateCustomDomain("   ")).toBe("Domain is required");
  });

  it("rejects domains with protocol", () => {
    expect(validateCustomDomain("https://example.com")).toBe(
      "Enter the domain without http:// or https://",
    );
  });

  it("rejects domains with http protocol", () => {
    expect(validateCustomDomain("http://example.com")).toBe(
      "Enter the domain without http:// or https://",
    );
  });

  it("rejects domains with trailing slash", () => {
    expect(validateCustomDomain("example.com/")).toBe(
      "Domain should not contain a path",
    );
  });

  it("rejects domains with path", () => {
    expect(validateCustomDomain("example.com/docs")).toBe(
      "Domain should not contain a path",
    );
  });

  it("rejects domains with spaces", () => {
    expect(validateCustomDomain("example .com")).toBe("Invalid domain format");
  });

  it("rejects single-label domains", () => {
    expect(validateCustomDomain("localhost")).toBe(
      "Domain must have at least two parts (e.g. docs.example.com)",
    );
  });

  it("rejects domains longer than 253 characters", () => {
    const long = `${"a".repeat(250)}.com`;
    expect(validateCustomDomain(long)).toBe(
      "Domain must be at most 253 characters",
    );
  });

  it("trims whitespace before validating", () => {
    expect(validateCustomDomain("  docs.example.com  ")).toBeNull();
  });
});

describe("generateCnameTarget", () => {
  it("generates a CNAME target from subdomain", () => {
    expect(generateCnameTarget("my-docs")).toBe("my-docs.mintlify-hosting.app");
  });

  it("generates a CNAME target from a different subdomain", () => {
    expect(generateCnameTarget("acme-api")).toBe(
      "acme-api.mintlify-hosting.app",
    );
  });
});

describe("domainVerificationStatus", () => {
  it('returns "not_configured" when no domain is set', () => {
    expect(domainVerificationStatus(null, null)).toBe("not_configured");
  });

  it('returns "pending" when domain is set but not verified', () => {
    expect(domainVerificationStatus("docs.example.com", null)).toBe("pending");
  });

  it('returns "pending" when verifiedAt is undefined', () => {
    expect(domainVerificationStatus("docs.example.com", undefined)).toBe(
      "pending",
    );
  });

  it('returns "verified" when domain is set and verifiedAt is present', () => {
    expect(
      domainVerificationStatus("docs.example.com", "2025-01-01T00:00:00Z"),
    ).toBe("verified");
  });
});
