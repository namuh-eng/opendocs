/**
 * API key authentication for v1 REST endpoints.
 *
 * Validates a Bearer token against stored API key hashes.
 * Updates lastUsedAt on successful authentication.
 */

import { eq } from "drizzle-orm";
import { hashApiKey } from "@/lib/api-keys";
import { extractBearerToken } from "@/lib/api-v1-deployments";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

interface ApiKeyAuthResult {
  keyId: string;
  orgId: string;
  type: "admin" | "assistant";
}

/**
 * Authenticate an incoming request using Bearer token API key.
 * Returns the key metadata on success, or null if authentication fails.
 */
export async function authenticateApiKey(
  authorizationHeader: string | null,
): Promise<ApiKeyAuthResult | null> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;

  const tokenHash = hashApiKey(token);

  const rows = await db
    .select({
      id: apiKeys.id,
      orgId: apiKeys.orgId,
      type: apiKeys.type,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, tokenHash))
    .limit(1);

  if (rows.length === 0) return null;

  const key = rows[0];

  // Update lastUsedAt (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .then(() => {})
    .catch(() => {});

  return {
    keyId: key.id,
    orgId: key.orgId,
    type: key.type,
  };
}
