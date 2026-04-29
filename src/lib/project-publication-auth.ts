import { readProjectAuthenticationSettings } from "@/lib/project-authentication-settings";

export function isProjectPasswordProtected(
  settings: unknown,
): settings is Record<string, unknown> {
  return readProjectAuthenticationSettings(settings).mode === "password";
}
