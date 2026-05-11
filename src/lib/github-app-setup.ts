import { getGitHubInstallationAccessToken } from "@/lib/github-installation-auth";
import type { GitHubRepo } from "@/lib/github-webhook";

function permissionFromRepo(
  repo: GitHubRepositoryResponse,
): GitHubRepo["permissions"] {
  if (repo.permissions?.admin) return "admin";
  if (repo.permissions?.push || repo.permissions?.maintain) return "write";
  return "read";
}

interface GitHubRepositoryResponse {
  full_name?: string;
  default_branch?: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
    maintain?: boolean;
  };
}

interface InstallationRepositoriesResponse {
  repositories?: GitHubRepositoryResponse[];
}

function hasNextPage(response: Response): boolean {
  const linkHeader = response.headers
    ?.get("link")
    ?.split(",")
    .some((link) => link.includes('rel="next"'));

  return linkHeader ?? false;
}

export async function hydrateGitHubInstallationRepos(
  installationId: string,
  options?: {
    fetchImpl?: typeof fetch;
    getToken?: typeof getGitHubInstallationAccessToken;
  },
): Promise<GitHubRepo[]> {
  const getToken = options?.getToken ?? getGitHubInstallationAccessToken;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const { token } = await getToken({ installationId });
  const repositories: GitHubRepositoryResponse[] = [];
  let page = 1;

  while (true) {
    const response = await fetchImpl(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to hydrate GitHub installation repositories (status ${response.status})`,
      );
    }

    const data = (await response.json()) as InstallationRepositoriesResponse;
    repositories.push(...(data.repositories ?? []));

    if (!hasNextPage(response)) break;
    page += 1;
  }

  return repositories
    .filter((repo): repo is GitHubRepositoryResponse & { full_name: string } =>
      Boolean(repo.full_name),
    )
    .map((repo) => ({
      fullName: repo.full_name,
      branch: repo.default_branch || "main",
      permissions: permissionFromRepo(repo),
    }));
}
