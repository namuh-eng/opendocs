import type {
  ProjectAuthenticationMode,
  ProjectAuthenticationSettings,
} from "@/lib/project-authentication-settings";

export type { ProjectAuthenticationMode, ProjectAuthenticationSettings };

interface ProjectSettingsWithAuthentication {
  authentication?: Partial<ProjectAuthenticationSettings> | null;
}

const LEGACY_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

function isLegacySha256PasswordHash(value: string) {
  return LEGACY_SHA256_HEX_PATTERN.test(value);
}

async function hashLegacySha256Password(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Browser-safe docs password hashing for the settings UI.
 *
 * The server verifier intentionally keeps SHA-256 compatibility for older saved
 * docs passwords, so the client can save a verifiable password hash without
 * bundling Node's `crypto` module into the dashboard route.
 */
export async function hashDocsPasswordForBrowser(password: string) {
  return hashLegacySha256Password(password);
}

export function readProjectAuthenticationSettings(
  settings: Record<string, unknown> | null | undefined,
): ProjectAuthenticationSettings {
  const authSettings = (settings as ProjectSettingsWithAuthentication | null)
    ?.authentication;
  const password =
    typeof authSettings?.password === "string" ? authSettings.password : "";
  const rawPasswordHash =
    typeof authSettings?.passwordHash === "string"
      ? authSettings.passwordHash
      : "";
  const passwordHash =
    rawPasswordHash || isLegacySha256PasswordHash(password)
      ? rawPasswordHash || password
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
