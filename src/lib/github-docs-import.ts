import { extractFrontmatter } from "@/lib/editor";
import { parseGitHubUrl } from "@/lib/git-settings";

export interface ImportedGitHubDocPage {
  path: string;
  title: string;
  content: string;
}

export interface GitHubImportRequestOptions {
  repoUrl?: string | null;
  repoBranch?: string | null;
  repoPath?: string | null;
  fetchImpl?: typeof fetch;
  headers?: HeadersInit;
}

export type GitHubDocsImportResult =
  | {
      ok: true;
      status: "imported";
      pages: ImportedGitHubDocPage[];
      source: { owner: string; repo: string; branch: string; path: string };
    }
  | {
      ok: false;
      status: "invalid_repo" | "fetch_failed" | "no_markdown_found";
      message: string;
    };

interface GitHubTreeResponse {
  tree?: { path: string; type: string }[];
}

function normalizeBasePath(repoPath?: string | null): string {
  const trimmed = repoPath?.trim() || "/";
  if (trimmed === "/") return "";
  return trimmed.replace(/^\/+|\/+$/g, "");
}

function toPagePath(filePath: string, basePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const relative = basePath
    ? normalized.startsWith(`${basePath}/`)
      ? normalized.slice(basePath.length + 1)
      : null
    : normalized;

  if (!relative) return null;
  if (!/\.(md|mdx)$/i.test(relative)) return null;

  const withoutExt = relative.replace(/\.(md|mdx)$/i, "");
  if (/^index$|^readme$/i.test(withoutExt)) {
    return "introduction";
  }

  const withoutIndex = withoutExt.replace(/\/index$|\/readme$/i, "");
  return (withoutIndex || "introduction").toLowerCase();
}

function toTitle(markdown: string, fallbackPath: string): string {
  // 1. Try frontmatter
  const { frontmatter, body } = extractFrontmatter(markdown);
  if (frontmatter.title) {
    return frontmatter.title;
  }

  // 2. Try actual H1 heading (outside code blocks)
  const lines = body.split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Markdown H1
    const mdMatch = line.match(/^#\s+(.+)$/);
    if (mdMatch) return mdMatch[1].trim();

    // HTML H1 (common in READMEs)
    const htmlMatch = line.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (htmlMatch) return htmlMatch[1].trim();
  }

  // 3. Fallback to path
  const lastSegment = fallbackPath.split("/").pop() || fallbackPath;
  return lastSegment
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function importGitHubDocs(
  params: GitHubImportRequestOptions,
): Promise<GitHubDocsImportResult> {
  const parsed = parseGitHubUrl(params.repoUrl?.trim() || "");
  if (!parsed) {
    return {
      ok: false,
      status: "invalid_repo",
      message: "Repository URL must be a GitHub repository",
    };
  }

  const fetchImpl = params.fetchImpl ?? fetch;
  const branch = params.repoBranch?.trim() || "main";
  const basePath = normalizeBasePath(params.repoPath ?? "/");
  const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  const treeResponse = await fetchImpl(treeUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(params.headers ?? {}),
    },
  });

  if (!treeResponse.ok) {
    return {
      ok: false,
      status: "fetch_failed",
      message: `GitHub tree request failed with status ${treeResponse.status}`,
    };
  }

  const treeData = (await treeResponse.json()) as GitHubTreeResponse;
  const markdownFiles = (treeData.tree ?? [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((path): path is string => Boolean(path))
    .filter((path) => {
      if (!/\.(md|mdx)$/i.test(path)) return false;
      if (!basePath) return true;
      return (
        path === `${basePath}.md` ||
        path === `${basePath}.mdx` ||
        path.startsWith(`${basePath}/`)
      );
    });

  if (markdownFiles.length === 0) {
    return {
      ok: false,
      status: "no_markdown_found",
      message: "No markdown files were found in the selected GitHub repository path",
    };
  }

  const pages = await Promise.all(
    markdownFiles.map(async (filePath) => {
      const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(branch)}/${filePath}`;
      const response = await fetchImpl(rawUrl, {
        headers: params.headers,
      });
      if (!response.ok) {
        throw new Error(
          `GitHub content request failed with status ${response.status} for ${filePath}`,
        );
      }
      const content = await response.text();
      const pagePath = toPagePath(filePath, basePath);
      if (!pagePath) {
        return null;
      }
      return {
        path: pagePath,
        title: toTitle(content, pagePath),
        content,
      } satisfies ImportedGitHubDocPage;
    }),
  );

  const importedPages = pages.filter(
    (page): page is ImportedGitHubDocPage => Boolean(page),
  );

  if (importedPages.length === 0) {
    return {
      ok: false,
      status: "no_markdown_found",
      message: "No markdown files were found in the selected GitHub repository path",
    };
  }

  // Rewrite relative images and links
  const processedPages = importedPages.map((page) => {
    const filePath = markdownFiles.find((f) => {
      const p = toPagePath(f, basePath);
      return p === page.path;
    });

    if (!filePath) return page;

    const fileDir = filePath.split("/").slice(0, -1).join("/");
    const rawBase = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(branch)}`;

    let content = page.content;

    // 1. Rewrite images: ![alt](relative/path.png)
    content = content.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/|ftp:\/\/|mailto:|\/)([^)]+)\)/g,
      (match, alt, relPath) => {
        const fullPath = fileDir ? `${fileDir}/${relPath}` : relPath;
        const normalized = fullPath.replace(/\.\//g, "").replace(/\/+/g, "/");
        return `![${alt}](${rawBase}/${normalized})`;
      },
    );

    // 2. Rewrite links: [text](relative/path.md)
    // For now we only rewrite if they end in .md/.mdx to avoid breaking external site links that happen to be relative
    content = content.replace(
      /\[([^\]]*)\]\((?!https?:\/\/|ftp:\/\/|mailto:|\/)([^)]+\.(md|mdx))\)/g,
      (match, text, relPath) => {
        const fullPath = fileDir ? `${fileDir}/${relPath}` : relPath;
        const normalized = fullPath.replace(/\.\//g, "").replace(/\/+/g, "/");
        const pagePath = toPagePath(normalized, basePath);

        if (pagePath && importedPages.some((p) => p.path === pagePath)) {
          // Internal doc link
          return `[${text}](../${pagePath})`;
        }

        // Fallback to GitHub source
        const githubUrl = `https://github.com/${parsed.owner}/${parsed.repo}/blob/${encodeURIComponent(branch)}/${normalized}`;
        return `[${text}](${githubUrl})`;
      },
    );

    return { ...page, content };
  });

  return {
    ok: true,
    status: "imported",
    pages: processedPages.sort((a, b) => a.path.localeCompare(b.path)),
    source: {
      owner: parsed.owner,
      repo: parsed.repo,
      branch,
      path: basePath ? `/${basePath}` : "/",
    },
  };
}

export async function importPublicGitHubDocs(
  params: GitHubImportRequestOptions,
): Promise<GitHubDocsImportResult> {
  return importGitHubDocs(params);
}
