/**
 * Custom domain utilities — validation, CNAME target generation, verification status.
 */

const DOMAIN_REGEX = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const HOSTING_SUFFIX = "mintlify-hosting.app";

/** Validate a custom domain string. Returns error string or null if valid. */
export function validateCustomDomain(domain: string): string | null {
  const trimmed = domain.trim();
  if (!trimmed) return "Domain is required";
  if (trimmed.length > 253) return "Domain must be at most 253 characters";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return "Enter the domain without http:// or https://";
  if (trimmed.includes("/")) return "Domain should not contain a path";
  if (!trimmed.includes("."))
    return "Domain must have at least two parts (e.g. docs.example.com)";
  if (!DOMAIN_REGEX.test(trimmed)) return "Invalid domain format";
  return null;
}

/** Generate the CNAME target that users should point their domain to. */
export function generateCnameTarget(subdomain: string): string {
  return `${subdomain}.${HOSTING_SUFFIX}`;
}

/** Determine the verification status of a custom domain. */
export function domainVerificationStatus(
  customDomain: string | null | undefined,
  verifiedAt: string | null | undefined,
): "not_configured" | "pending" | "verified" {
  if (!customDomain) return "not_configured";
  if (!verifiedAt) return "pending";
  return "verified";
}
