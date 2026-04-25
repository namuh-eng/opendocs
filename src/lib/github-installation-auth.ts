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

export async function getGitHubInstallationAccessToken(_params: {
  installationId: string;
}): Promise<GitHubInstallationAccessTokenResult> {
  throw new GitHubInstallationAuthNotConfiguredError();
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
