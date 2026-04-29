import { createHmac, timingSafeEqual } from "node:crypto";
import {
  hashDocsPassword,
  readProjectAuthenticationSettings,
} from "@/lib/project-authentication-settings";

const COOKIE_PREFIX = "docs_access";

export function getDocsAccessCookieName(subdomain: string) {
  return `${COOKIE_PREFIX}_${subdomain.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function getSigningSecret() {
  return process.env.BETTER_AUTH_SECRET || "development-docs-access-secret";
}

export function createDocsAccessToken(subdomain: string, credential: string) {
  return createHmac("sha256", getSigningSecret())
    .update(`${subdomain}:${credential}`)
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

function getStoredCredential(settings: ProjectSettings) {
  const auth = readProjectAuthenticationSettings(settings);
  if (auth.mode !== "password") return null;
  return auth.passwordHash || auth.password || null;
}

export async function isValidDocsPassword(
  settings: ProjectSettings,
  password: string,
) {
  const auth = readProjectAuthenticationSettings(settings);
  if (auth.mode !== "password") return false;
  if (auth.passwordHash) {
    return safeEqual(auth.passwordHash, await hashDocsPassword(password));
  }
  return safeEqual(auth.password, password);
}

export function hasValidDocsAccess(
  settings: ProjectSettings,
  subdomain: string,
  token: string | undefined,
) {
  const credential = getStoredCredential(settings);
  if (!credential) return true;
  if (!token) return false;
  return safeEqual(token, createDocsAccessToken(subdomain, credential));
}
