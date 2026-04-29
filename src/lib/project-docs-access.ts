import { createHmac, timingSafeEqual } from "node:crypto";
import { readProjectAuthenticationSettings } from "@/lib/project-authentication-settings";

const COOKIE_PREFIX = "docs_access";

export function getDocsAccessCookieName(subdomain: string) {
  return `${COOKIE_PREFIX}_${subdomain.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function getSigningSecret() {
  return process.env.BETTER_AUTH_SECRET || "development-docs-access-secret";
}

export function createDocsAccessToken(subdomain: string, password: string) {
  return createHmac("sha256", getSigningSecret())
    .update(`${subdomain}:${password}`)
    .digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

type ProjectSettings = Record<string, unknown> | null | undefined;

export function isDocsAccessRequired(settings: ProjectSettings) {
  return readProjectAuthenticationSettings(settings).mode === "password";
}

export function isValidDocsPassword(
  settings: ProjectSettings,
  password: string,
) {
  const auth = readProjectAuthenticationSettings(settings);
  return auth.mode === "password" && safeEqual(auth.password, password);
}

export function hasValidDocsAccess(
  settings: ProjectSettings,
  subdomain: string,
  token: string | undefined,
) {
  const auth = readProjectAuthenticationSettings(settings);
  if (auth.mode !== "password") return true;
  if (!token) return false;
  return safeEqual(token, createDocsAccessToken(subdomain, auth.password));
}
