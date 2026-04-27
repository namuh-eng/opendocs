import { createSign } from "node:crypto";

export class GitHubInstallationAuthNotConfiguredError extends Error {
  constructor(message = "GitHub App installation auth is not configured") {
    super(message);
    this.name = "GitHubInstallationAuthNotConfiguredError";
  }
}

export interface GitHubInstallationAccessTokenResult {
  token: string;
  expiresAt?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new GitHubInstallationAuthNotConfiguredError(
      `Missing required GitHub App auth environment variable: ${name}`,
    );
  }
  return value;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function buildGitHubAppJwt(params: {
  appId: string;
  privateKey: string;
  nowMs?: number;
}): string {
  const now = Math.floor((params.nowMs ?? Date.now()) / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: params.appId,
    }),
  );
  const unsigned = `${header}.${payload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(params.privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsigned}.${signature}`;
}

export async function getGitHubInstallationAccessToken(
  params: {
    installationId: string;
  },
  options?: {
    fetchImpl?: typeof fetch;
    nowMs?: number;
    buildJwt?: typeof buildGitHubAppJwt;
  },
): Promise<GitHubInstallationAccessTokenResult> {
  const appId = requireEnv("GITHUB_APP_ID");
  const privateKey = requireEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  const fetchImpl = options?.fetchImpl ?? fetch;
  const buildJwt = options?.buildJwt ?? buildGitHubAppJwt;
  const jwt = buildJwt({
    appId,
    privateKey,
    nowMs: options?.nowMs,
  });

  const response = await fetchImpl(
    `https://api.github.com/app/installations/${params.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to mint GitHub installation access token (status ${response.status})`,
    );
  }

  const data = (await response.json()) as {
    token?: string;
    expires_at?: string;
  };

  if (!data.token) {
    throw new Error(
      "GitHub installation access token response did not include a token",
    );
  }

  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

export async function buildGitHubInstallationAuthHeaders(
  params: {
    installationId: string;
  },
  options?: {
    getToken?: typeof getGitHubInstallationAccessToken;
  },
): Promise<HeadersInit> {
  const getToken = options?.getToken ?? getGitHubInstallationAccessToken;
  const result = await getToken(params);
  return {
    Authorization: `Bearer ${result.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export const __private__ = {
  buildGitHubAppJwt,
};
