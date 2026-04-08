import {
  ADMIN_KEY_PREFIX,
  ASSISTANT_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  maskKeyPrefix,
  validateCreateApiKeyRequest,
  verifyApiKey,
} from "@/lib/api-keys";
import { describe, expect, it } from "vitest";

describe("API Key Constants", () => {
  it("has correct admin key prefix", () => {
    expect(ADMIN_KEY_PREFIX).toBe("mint_");
  });

  it("has correct assistant key prefix", () => {
    expect(ASSISTANT_KEY_PREFIX).toBe("mint_dsc_");
  });
});

describe("generateApiKey", () => {
  it("generates admin key with mint_ prefix", () => {
    const key = generateApiKey("admin");
    expect(key).toMatch(/^mint_[a-f0-9]{32}$/);
  });

  it("generates assistant key with mint_dsc_ prefix", () => {
    const key = generateApiKey("assistant");
    expect(key).toMatch(/^mint_dsc_[a-f0-9]{32}$/);
  });

  it("generates unique keys each time", () => {
    const key1 = generateApiKey("admin");
    const key2 = generateApiKey("admin");
    expect(key1).not.toBe(key2);
  });
});

describe("hashApiKey", () => {
  it("returns a hex string", () => {
    const hash = hashApiKey("mint_abc123");
    expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 = 64 hex chars
  });

  it("produces consistent hash for same input", () => {
    const hash1 = hashApiKey("mint_test123");
    const hash2 = hashApiKey("mint_test123");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = hashApiKey("mint_aaa");
    const hash2 = hashApiKey("mint_bbb");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyApiKey", () => {
  it("returns true for matching key and hash", () => {
    const key = "mint_test123456";
    const hash = hashApiKey(key);
    expect(verifyApiKey(key, hash)).toBe(true);
  });

  it("returns false for non-matching key", () => {
    const hash = hashApiKey("mint_correct");
    expect(verifyApiKey("mint_wrong", hash)).toBe(false);
  });
});

describe("maskKeyPrefix", () => {
  it("masks admin key showing prefix + first 4 chars", () => {
    const masked = maskKeyPrefix("mint_abcdef1234567890");
    expect(masked).toBe("mint_abcd....");
  });

  it("masks assistant key showing prefix + first 4 chars", () => {
    const masked = maskKeyPrefix("mint_dsc_abcdef1234567890");
    expect(masked).toBe("mint_dsc_abcd....");
  });

  it("handles short keys gracefully", () => {
    const masked = maskKeyPrefix("mint_ab");
    expect(masked).toBe("mint_ab....");
  });
});

describe("validateCreateApiKeyRequest", () => {
  it("accepts valid admin key request", () => {
    const result = validateCreateApiKeyRequest({
      name: "My Key",
      type: "admin",
    });
    expect(result).toEqual({ valid: true, name: "My Key", type: "admin" });
  });

  it("accepts valid assistant key request", () => {
    const result = validateCreateApiKeyRequest({
      name: "Chat Key",
      type: "assistant",
    });
    expect(result).toEqual({
      valid: true,
      name: "Chat Key",
      type: "assistant",
    });
  });

  it("defaults type to admin when not specified", () => {
    const result = validateCreateApiKeyRequest({ name: "Default Key" });
    expect(result).toEqual({ valid: true, name: "Default Key", type: "admin" });
  });

  it("rejects empty name", () => {
    const result = validateCreateApiKeyRequest({ name: "" });
    expect(result).toEqual({ valid: false, error: "API key name is required" });
  });

  it("rejects missing name", () => {
    const result = validateCreateApiKeyRequest({});
    expect(result).toEqual({ valid: false, error: "API key name is required" });
  });

  it("rejects name over 128 characters", () => {
    const result = validateCreateApiKeyRequest({ name: "a".repeat(129) });
    expect(result).toEqual({
      valid: false,
      error: "Name must be at most 128 characters",
    });
  });

  it("rejects invalid type", () => {
    const result = validateCreateApiKeyRequest({
      name: "Key",
      type: "superadmin",
    });
    expect(result).toEqual({
      valid: false,
      error: "Type must be 'admin' or 'assistant'",
    });
  });

  it("rejects non-object body", () => {
    const result = validateCreateApiKeyRequest(null);
    expect(result).toEqual({ valid: false, error: "API key name is required" });
  });

  it("trims whitespace from name", () => {
    const result = validateCreateApiKeyRequest({ name: "  Trimmed Key  " });
    expect(result).toEqual({ valid: true, name: "Trimmed Key", type: "admin" });
  });
});
