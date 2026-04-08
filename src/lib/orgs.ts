/**
 * Organization utilities — slug generation, validation, request parsing.
 */

/** Convert a string to a URL-safe slug (lowercase, hyphens, no special chars). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Validate an org name. Returns error string or null if valid. */
export function validateOrgName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Organization name is required";
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  if (trimmed.length > 128) return "Name must be at most 128 characters";
  return null;
}

/** Validate a create-org request body. */
export function validateCreateOrgRequest(body: unknown):
  | {
      valid: true;
      name: string;
    }
  | {
      valid: false;
      error: string;
    } {
  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    typeof (body as Record<string, unknown>).name !== "string"
  ) {
    return { valid: false, error: "Organization name is required" };
  }

  const name = ((body as Record<string, unknown>).name as string).trim();
  const error = validateOrgName(name);
  if (error) return { valid: false, error };
  return { valid: true, name };
}
