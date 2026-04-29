import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

export type ProjectAuthenticationMode = "public" | "password";

export interface ProjectAuthenticationSettings {
  mode: ProjectAuthenticationMode;
  /** Deprecated legacy plaintext value. Only read for backward compatibility. */
  password: string;
  /** Slow password hash for the shared docs password. */
  passwordHash?: string;
}

export const DEFAULT_PROJECT_AUTHENTICATION_SETTINGS: ProjectAuthenticationSettings =
  {
    mode: "public",
    password: "",
    passwordHash: "",
  };

interface ProjectSettingsWithAuthentication {
  authentication?: Partial<ProjectAuthenticationSettings> | null;
}

const scrypt = promisify(scryptCallback);
const SCRYPT_PREFIX = "scrypt:v1";
const SCRYPT_KEY_LENGTH = 64;

export function isLegacySha256PasswordHash(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}

export function isDocsPasswordHash(value: string) {
  return (
    isLegacySha256PasswordHash(value) ||
    new RegExp(`^${SCRYPT_PREFIX}:[a-f0-9]{32}:[a-f0-9]{128}$`, "i").test(value)
  );
}

async function hashLegacySha256Password(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashDocsPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `${SCRYPT_PREFIX}:${salt}:${key.toString("hex")}`;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyDocsPasswordHash(hash: string, password: string) {
  if (isLegacySha256PasswordHash(hash)) {
    return safeEqual(hash, await hashLegacySha256Password(password));
  }

  const [prefix, version, salt, key] = hash.split(":");
  if (`${prefix}:${version}` !== SCRYPT_PREFIX || !salt || !key) return false;

  const derived = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return safeEqual(key, derived.toString("hex"));
}

export function readProjectAuthenticationSettings(
  settings: Record<string, unknown> | null | undefined,
): ProjectAuthenticationSettings {
  const authSettings = (settings as ProjectSettingsWithAuthentication | null)
    ?.authentication;
  const password =
    typeof authSettings?.password === "string" ? authSettings.password : "";
  const passwordHash =
    typeof authSettings?.passwordHash === "string"
      ? authSettings.passwordHash
      : isDocsPasswordHash(password)
        ? password
        : "";

  return {
    mode: authSettings?.mode === "password" ? "password" : "public",
    password: passwordHash ? "" : password,
    passwordHash,
  };
}

export function mergeProjectAuthenticationSettings(
  settings: Record<string, unknown> | null | undefined,
  authentication: ProjectAuthenticationSettings,
) {
  return {
    ...(settings ?? {}),
    authentication: {
      mode: authentication.mode,
      password: "",
      passwordHash:
        authentication.mode === "password"
          ? authentication.passwordHash || authentication.password
          : "",
    },
  };
}

export function redactProjectAuthenticationSettings(
  settings: Record<string, unknown> | null | undefined,
) {
  const safeSettings = { ...(settings ?? {}) };
  if (
    safeSettings.authentication &&
    typeof safeSettings.authentication === "object"
  ) {
    const auth = safeSettings.authentication as Record<string, unknown>;
    safeSettings.authentication = {
      ...auth,
      password: undefined,
      passwordHash: undefined,
      passwordConfigured:
        typeof auth.password === "string" ||
        typeof auth.passwordHash === "string",
    };
  }
  return safeSettings;
}

export function validateProjectAuthenticationSettings(
  authentication: ProjectAuthenticationSettings,
): string | null {
  if (
    authentication.mode === "password" &&
    !authentication.password.trim() &&
    !authentication.passwordHash?.trim()
  ) {
    return "Password protection requires a password.";
  }

  return null;
}
