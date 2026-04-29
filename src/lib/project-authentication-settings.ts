export type ProjectAuthenticationMode = "public" | "password";

export interface ProjectAuthenticationSettings {
  mode: ProjectAuthenticationMode;
  password: string;
}

export const DEFAULT_PROJECT_AUTHENTICATION_SETTINGS: ProjectAuthenticationSettings =
  {
    mode: "public",
    password: "",
  };

interface ProjectSettingsWithAuthentication {
  authentication?: Partial<ProjectAuthenticationSettings> | null;
}

export function readProjectAuthenticationSettings(
  settings: Record<string, unknown> | null | undefined,
): ProjectAuthenticationSettings {
  const authSettings = (settings as ProjectSettingsWithAuthentication | null)
    ?.authentication;

  return {
    mode: authSettings?.mode === "password" ? "password" : "public",
    password:
      typeof authSettings?.password === "string" ? authSettings.password : "",
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
      password:
        authentication.mode === "password" ? authentication.password : "",
    },
  };
}

export function validateProjectAuthenticationSettings(
  authentication: ProjectAuthenticationSettings,
): string | null {
  if (authentication.mode === "password" && !authentication.password.trim()) {
    return "Password protection requires a password.";
  }

  return null;
}
