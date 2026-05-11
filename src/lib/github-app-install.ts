const GITHUB_APP_SLUG_PATTERN = /^[a-zA-Z0-9-]+$/;

export interface GitHubAppInstallEnv {
  [key: string]: string | undefined;
  GITHUB_APP_INSTALL_URL?: string;
  GITHUB_APP_SLUG?: string;
  NEXT_PUBLIC_GITHUB_APP_SLUG?: string;
}

function normalizeExplicitInstallUrl(value: string | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "github.com" ||
      !parsed.pathname.startsWith("/apps/")
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeAppSlug(value: string | undefined): string | null {
  const slug = value?.trim().replace(/^\/+|\/+$/g, "");
  if (!slug || !GITHUB_APP_SLUG_PATTERN.test(slug)) return null;
  return slug;
}

export function resolveGitHubAppInstallUrl(
  env: GitHubAppInstallEnv = process.env,
): string | null {
  const explicitUrl = normalizeExplicitInstallUrl(env.GITHUB_APP_INSTALL_URL);
  if (explicitUrl) return explicitUrl;

  const slug =
    normalizeAppSlug(env.GITHUB_APP_SLUG) ??
    normalizeAppSlug(env.NEXT_PUBLIC_GITHUB_APP_SLUG);
  if (!slug) return null;

  return `https://github.com/apps/${slug}/installations/new`;
}
