/**
 * API key generation, hashing, validation, and masking utilities.
 *
 * Key format:
 *   Admin keys:     mint_{32 hex chars}
 *   Assistant keys: mint_dsc_{32 hex chars}
 */

import { createHash, randomBytes } from "node:crypto";

export const ADMIN_KEY_PREFIX = "mint_";
export const ASSISTANT_KEY_PREFIX = "mint_dsc_";

type ApiKeyType = "admin" | "assistant";

/** Generate a new API key with the appropriate prefix. */
export function generateApiKey(type: ApiKeyType): string {
  const prefix = type === "assistant" ? ASSISTANT_KEY_PREFIX : ADMIN_KEY_PREFIX;
  const token = randomBytes(16).toString("hex"); // 32 hex chars
  return `${prefix}${token}`;
}

/** SHA-256 hash of a raw API key (for storage). */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Verify a raw key matches a stored hash. */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  return hashApiKey(rawKey) === storedHash;
}

/** Extract the visible prefix portion of a key (prefix + first 4 random chars). */
export function maskKeyPrefix(rawKey: string): string {
  // Find where the random part starts
  let prefixEnd: number;
  if (rawKey.startsWith(ASSISTANT_KEY_PREFIX)) {
    prefixEnd = ASSISTANT_KEY_PREFIX.length;
  } else if (rawKey.startsWith(ADMIN_KEY_PREFIX)) {
    prefixEnd = ADMIN_KEY_PREFIX.length;
  } else {
    prefixEnd = 0;
  }

  const randomPart = rawKey.slice(prefixEnd);
  const visibleChars = randomPart.slice(0, 4);
  return `${rawKey.slice(0, prefixEnd)}${visibleChars}....`;
}

/** Extract the storable key prefix (prefix + first 8 random chars) for identification. */
export function extractKeyPrefix(rawKey: string): string {
  if (rawKey.startsWith(ASSISTANT_KEY_PREFIX)) {
    return rawKey.slice(0, ASSISTANT_KEY_PREFIX.length + 8);
  }
  return rawKey.slice(0, ADMIN_KEY_PREFIX.length + 8);
}

/** Validate a create-API-key request body. */
export function validateCreateApiKeyRequest(
  body: unknown,
):
  | { valid: true; name: string; type: ApiKeyType }
  | { valid: false; error: string } {
  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    typeof (body as Record<string, unknown>).name !== "string"
  ) {
    return { valid: false, error: "API key name is required" };
  }

  const name = ((body as Record<string, unknown>).name as string).trim();
  if (!name) return { valid: false, error: "API key name is required" };
  if (name.length > 128)
    return { valid: false, error: "Name must be at most 128 characters" };

  const rawType = (body as Record<string, unknown>).type;
  const type: ApiKeyType =
    rawType === undefined ? "admin" : (rawType as ApiKeyType);

  if (type !== "admin" && type !== "assistant") {
    return { valid: false, error: "Type must be 'admin' or 'assistant'" };
  }

  return { valid: true, name, type };
}
