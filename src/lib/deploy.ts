/**
 * Deploy utilities — health check response builder, deploy config validation,
 * environment variable filtering for production deployment.
 */

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: "connected" | "disconnected";
    storage: "available" | "unavailable";
  };
}

export interface DeployConfig {
  ecrUri: string;
  region: string;
  serviceName: string;
  imageTag: string;
  port: number;
  envVars: Record<string, string>;
}

/** App start time — used for uptime calculation */
const APP_START_TIME = Date.now();

export function buildHealthResponse(overrides: {
  dbConnected: boolean;
  storageAvailable: boolean;
  version: string;
  startTime?: number;
}): HealthCheckResponse {
  const startTime = overrides.startTime ?? APP_START_TIME;
  return {
    status:
      overrides.dbConnected && overrides.storageAvailable ? "ok" : "degraded",
    version: overrides.version,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: overrides.dbConnected ? "connected" : "disconnected",
      storage: overrides.storageAvailable ? "available" : "unavailable",
    },
  };
}

export function validateDeployConfig(config: Partial<DeployConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!config.ecrUri) errors.push("ecrUri is required");
  if (!config.region) errors.push("region is required");
  if (!config.serviceName) errors.push("serviceName is required");
  if (!config.imageTag) errors.push("imageTag is required");
  if (config.port !== undefined && (config.port < 1 || config.port > 65535)) {
    errors.push("port must be between 1 and 65535");
  }
  if (
    config.ecrUri &&
    !config.ecrUri.match(/^\d+\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\//)
  ) {
    errors.push("ecrUri must be a valid ECR URI");
  }
  return { valid: errors.length === 0, errors };
}

export function buildImageUri(ecrUri: string, tag: string): string {
  return `${ecrUri}:${tag}`;
}

export function generateServiceName(appName: string, env: string): string {
  return `${appName}-${env}`;
}

const DEPLOY_ENV_ALLOWLIST = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "S3_BUCKET",
  "AWS_REGION",
  "NEXT_PUBLIC_APP_URL",
  "ANTHROPIC_API_KEY",
  "NODE_ENV",
] as const;

export function filterEnvForDeploy(
  env: Record<string, string>,
): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const key of DEPLOY_ENV_ALLOWLIST) {
    if (env[key]) filtered[key] = env[key];
  }
  return filtered;
}
