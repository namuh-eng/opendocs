import {
  buildHealthResponse,
  buildImageUri,
  filterEnvForDeploy,
  generateServiceName,
  validateDeployConfig,
} from "@/lib/deploy";
import type { DeployConfig } from "@/lib/deploy";
import { describe, expect, it } from "vitest";

describe("Health check response", () => {
  it("returns ok status when all checks pass", () => {
    const resp = buildHealthResponse({
      dbConnected: true,
      storageAvailable: true,
      version: "1.0.0",
      startTime: Date.now() - 60000,
    });
    expect(resp.status).toBe("ok");
    expect(resp.checks.database).toBe("connected");
    expect(resp.checks.storage).toBe("available");
    expect(resp.version).toBe("1.0.0");
    expect(resp.uptime).toBeGreaterThanOrEqual(59);
  });

  it("returns degraded when database is disconnected", () => {
    const resp = buildHealthResponse({
      dbConnected: false,
      storageAvailable: true,
      version: "1.0.0",
      startTime: Date.now(),
    });
    expect(resp.status).toBe("degraded");
    expect(resp.checks.database).toBe("disconnected");
  });

  it("returns degraded when storage is unavailable", () => {
    const resp = buildHealthResponse({
      dbConnected: true,
      storageAvailable: false,
      version: "1.0.0",
      startTime: Date.now(),
    });
    expect(resp.status).toBe("degraded");
    expect(resp.checks.storage).toBe("unavailable");
  });

  it("includes ISO timestamp", () => {
    const resp = buildHealthResponse({
      dbConnected: true,
      storageAvailable: true,
      version: "1.0.0",
      startTime: Date.now(),
    });
    expect(() => new Date(resp.timestamp)).not.toThrow();
    expect(resp.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("calculates uptime in seconds", () => {
    const startTime = Date.now() - 120000;
    const resp = buildHealthResponse({
      dbConnected: true,
      storageAvailable: true,
      version: "1.0.0",
      startTime,
    });
    expect(resp.uptime).toBeGreaterThanOrEqual(119);
    expect(resp.uptime).toBeLessThanOrEqual(121);
  });
});

describe("Deploy config validation", () => {
  const validConfig: DeployConfig = {
    ecrUri: "699486076867.dkr.ecr.us-east-1.amazonaws.com/namuh-mintlify",
    region: "us-east-1",
    serviceName: "namuh-mintlify-prod",
    imageTag: "latest",
    port: 3000,
    envVars: {},
  };

  it("accepts a valid config", () => {
    const result = validateDeployConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing ecrUri", () => {
    const result = validateDeployConfig({ ...validConfig, ecrUri: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("ecrUri is required");
  });

  it("rejects missing region", () => {
    const result = validateDeployConfig({ ...validConfig, region: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("region is required");
  });

  it("rejects missing serviceName", () => {
    const result = validateDeployConfig({ ...validConfig, serviceName: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid port", () => {
    const result = validateDeployConfig({ ...validConfig, port: 99999 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("port must be between 1 and 65535");
  });

  it("rejects invalid ECR URI format", () => {
    const result = validateDeployConfig({
      ...validConfig,
      ecrUri: "not-a-real-ecr-uri",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("ecrUri must be a valid ECR URI");
  });

  it("collects multiple errors", () => {
    const result = validateDeployConfig({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Image URI builder", () => {
  it("appends tag to ECR URI", () => {
    const uri = buildImageUri(
      "699486076867.dkr.ecr.us-east-1.amazonaws.com/namuh-mintlify",
      "v1.0.0",
    );
    expect(uri).toBe(
      "699486076867.dkr.ecr.us-east-1.amazonaws.com/namuh-mintlify:v1.0.0",
    );
  });

  it("handles latest tag", () => {
    const uri = buildImageUri(
      "699486076867.dkr.ecr.us-east-1.amazonaws.com/namuh-mintlify",
      "latest",
    );
    expect(uri).toContain(":latest");
  });
});

describe("Service name generator", () => {
  it("creates service name from app name and env", () => {
    expect(generateServiceName("namuh-mintlify", "prod")).toBe(
      "namuh-mintlify-prod",
    );
  });

  it("handles staging env", () => {
    expect(generateServiceName("namuh-mintlify", "staging")).toBe(
      "namuh-mintlify-staging",
    );
  });
});

describe("Deploy env filtering", () => {
  it("filters to only allowed env vars", () => {
    const env = {
      DATABASE_URL: "postgres://...",
      BETTER_AUTH_SECRET: "secret",
      DB_PASSWORD: "should-be-excluded",
      CLOUDFLARE_API_TOKEN: "should-be-excluded",
      S3_BUCKET: "my-bucket",
    };
    const filtered = filterEnvForDeploy(env);
    expect(filtered.DATABASE_URL).toBe("postgres://...");
    expect(filtered.BETTER_AUTH_SECRET).toBe("secret");
    expect(filtered.S3_BUCKET).toBe("my-bucket");
    expect(filtered).not.toHaveProperty("DB_PASSWORD");
    expect(filtered).not.toHaveProperty("CLOUDFLARE_API_TOKEN");
  });

  it("omits missing env vars", () => {
    const filtered = filterEnvForDeploy({ DATABASE_URL: "postgres://..." });
    expect(Object.keys(filtered)).toHaveLength(1);
  });
});
