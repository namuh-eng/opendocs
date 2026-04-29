export type ProjectAuthenticationMode = "public" | "password";

export interface ProjectAuthenticationSettings {
  mode: ProjectAuthenticationMode;
  /** Deprecated legacy plaintext value. Only read for backward compatibility. */
  password: string;
  /** SHA-256 hash of the shared docs password. */
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

export function isPasswordHash(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}

export async function hashDocsPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
      : isPasswordHash(password)
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
