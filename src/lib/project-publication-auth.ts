import { readProjectAuthenticationSettings } from "@/lib/project-authentication-settings";

export function isProjectPasswordProtected(
  settings: Record<string, unknown> | null | undefined,
): settings is Record<string, unknown> {
  return readProjectAuthenticationSettings(settings).mode === "password";
}
