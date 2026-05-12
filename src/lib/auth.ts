import { db } from "@/lib/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

type BetterAuthBaseUrlConfig = NonNullable<BetterAuthOptions["baseURL"]>;

const LOCAL_AUTH_HOSTS = ["localhost:3015", "127.0.0.1:3015", "[::1]:3015"];

export function getBetterAuthUrl() {
  const url = process.env.BETTER_AUTH_URL?.trim();
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_URL is required in production");
  }
  return "http://localhost:3015";
}

function getHostFromUrl(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function getBetterAuthBaseUrlConfig(): BetterAuthBaseUrlConfig {
  const configuredUrl = getBetterAuthUrl();

  if (process.env.NODE_ENV === "production") {
    return configuredUrl;
  }

  const configuredHost = getHostFromUrl(configuredUrl);
  const allowedHosts = Array.from(
    new Set([...LOCAL_AUTH_HOSTS, ...(configuredHost ? [configuredHost] : [])]),
  );

  return {
    allowedHosts,
    fallback: configuredUrl,
    protocol: "auto",
  };
}

export const auth = betterAuth({
  baseURL: getBetterAuthBaseUrlConfig(),
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});
