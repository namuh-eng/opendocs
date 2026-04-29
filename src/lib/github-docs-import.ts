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

  let relative: string | null = null;
  if (!basePath) {
    relative = normalized;
  } else {
    const basePrefix = `${basePath}/`;
    if (normalized.startsWith(basePrefix)) {
      relative = normalized.slice(basePrefix.length);
    } else {
      return null;
    }
  }

  if (!relative) return null;
  if (!/\.(md|mdx)$/i.test(relative)) return null;

  const withoutExt = relative.replace(/\.(md|mdx)$/i, "");
  if (/^index$|^readme$/i.test(withoutExt)) {
    return "introduction";
  }

  const pathParts = withoutExt.split("/");
  const lastPart = pathParts[pathParts.length - 1];
  if (/^index$|^readme$/i.test(lastPart)) {
    return pathParts.slice(0, -1).join("/").toLowerCase();
  }

  return withoutExt.toLowerCase();
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
    if (htmlMatch) {
      return htmlMatch[1].replace(/<[^>]*>/g, "").trim();
    }
  }

  // 3. Fallback to path
  const lastSegment = fallbackPath.split("/").pop() || fallbackPath;
  return lastSegment
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function htmlAttributesToRecord(attrs: string): Record<string, string> {
  const record: Record<string, string> = {};
  attrs.replace(
    /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g,
    (_match, name, _raw, dquoted, squoted, bare) => {
      record[name.toLowerCase()] = dquoted ?? squoted ?? bare ?? "";
      return "";
    },
  );
  return record;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

function normalizeGitHubMarkdownContent(content: string): string {
  let normalized = content.replace(/\r\n?/g, "\n");

  normalized = normalized.replace(/<br\s*\/?\s*>/gi, "\n");

  normalized = normalized.replace(
    /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_match, level: string, inner: string) =>
      `${"#".repeat(Number(level))} ${stripHtmlTags(inner)}`,
  );

  normalized = normalized.replace(
    /<img\b([^>]*)\/?\s*>/gi,
    (match: string, attrs: string) => {
      const parsed = htmlAttributesToRecord(attrs);
      if (!parsed.src) return match;
      return `![${parsed.alt ?? ""}](${parsed.src})`;
    },
  );

  normalized = normalized.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (match: string, attrs: string, inner: string) => {
      const parsed = htmlAttributesToRecord(attrs);
      const label = stripHtmlTags(inner);
      if (!parsed.href || !label) return label || match;
      return `[${label}](${parsed.href})`;
    },
  );

  normalized = normalized.replace(/<\/?(?:p|div|span|center)\b[^>]*>/gi, "\n");
  normalized = normalized.replace(/<!--([\s\S]*?)-->/g, "");

  return normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const EXCLUDED_PATHS = [
  /^agents\.md$/i,
  /^claude\.md$/i,
  /^memory\.md$/i,
  /^soul\.md$/i,
  /^tools\.md$/i,
  /^\.github\//i,
  /^agent_docs\//i,
  /^memory\//i,
  /^private\//i,
  /^node_modules\//i,
];

function isExcludedPath(filePath: string): boolean {
  return EXCLUDED_PATHS.some((pattern) => pattern.test(filePath));
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
      if (isExcludedPath(path)) return false;
      if (!basePath) return true;
      return (
        path.startsWith(`${basePath}/`) ||
        path === `${basePath}.md` ||
        path === `${basePath}.mdx`
      );
    });

  if (markdownFiles.length === 0) {
    return {
      ok: false,
      status: "no_markdown_found",
      message:
        "No markdown files were found in the selected GitHub repository path",
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
      const content = normalizeGitHubMarkdownContent(await response.text());
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

  const importedPages = pages.filter((page): page is ImportedGitHubDocPage =>
    Boolean(page),
  );

  if (importedPages.length === 0) {
    return {
      ok: false,
      status: "no_markdown_found",
      message:
        "No markdown files were found in the selected GitHub repository path",
    };
  }

  // Rewrite relative images and links
  const processedPages = importedPages.map((page) => {
    // Find source file by path
    const filePath = markdownFiles.find((f) => {
      const p = toPagePath(f, basePath);
      return p === page.path;
    });

    if (!filePath) return page;

    const fileDir = filePath.split("/").slice(0, -1).join("/");
    const rawBase = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(branch)}`;

    let content = page.content;

    const splitRelPath = (attr: string): [string, string] => {
      const trimmed = attr.trim();
      const match = trimmed.match(/^([^\s"']+)(.*)$/);
      if (!match) return [trimmed, ""];
      return [match[1], match[2]];
    };

    // 1. Rewrite images: ![alt](relative/path.png "title")
    content = content.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/|ftp:\/\/|mailto:|\/)([^)]+)\)/g,
      (match, alt, relPathAttr) => {
        const [cleanPath, titlePart] = splitRelPath(relPathAttr);
        let fullPath = fileDir ? `${fileDir}/${cleanPath}` : cleanPath;
        fullPath = fullPath.replace(/^\.\//, "");
        while (fullPath.includes("/../")) {
          fullPath = fullPath.replace(/[^\/]+\/\.\.\//, "");
        }
        fullPath = fullPath.replace(/^\.\//, "").replace(/^\.\..?\//, "");

        // Handle images in docs/ folder when the markdown file is in docs/ already
        if (fileDir === "docs" && cleanPath.startsWith("docs/")) {
          fullPath = cleanPath;
        }

        return `![${alt}](${rawBase}/${fullPath.replace(/\/+/g, "/")}${titlePart})`;
      },
    );

    // 2. Rewrite links: [text](relative/path.md "title")
    content = content.replace(
      /\[([^\]]*)\]\((?!https?:\/\/|ftp:\/\/|mailto:|\/)([^)]+)\)/g,
      (match, text, relPathAttr) => {
        const [cleanPath, titlePart] = splitRelPath(relPathAttr);

        let fullPath = fileDir ? `${fileDir}/${cleanPath}` : cleanPath;
        fullPath = fullPath.replace(/^\.\//, "");
        while (fullPath.includes("/../")) {
          fullPath = fullPath.replace(/[^\/]+\/\.\.\//, "");
        }
        fullPath = fullPath.replace(/^\.\//, "").replace(/^\.\..?\//, "");
        const normalized = fullPath.replace(/\/+/g, "/");

        let targetPagePath: string | null = null;
        if (/\.(md|mdx)$/i.test(normalized)) {
          targetPagePath = toPagePath(normalized, basePath);
        } else {
          targetPagePath = toPagePath(`${normalized}/README.md`, basePath);
        }

        if (
          targetPagePath &&
          importedPages.some((p) => p.path === targetPagePath)
        ) {
          // If the link target is actually in our imported set, rewrite to doc-relative path.
          const currentPathParts =
            page.path === "introduction" ? [] : page.path.split("/");
          let prefix = "";
          if (currentPathParts.length === 0) {
            // Root intro page to other pages
            prefix = "../";
          } else {
            // Nested page to other pages (need to back out then into target)
            prefix = "../".repeat(currentPathParts.length + 1);
          }
          return `[${text}](${prefix}${targetPagePath}${titlePart})`;
        }

        if (/\.(md|mdx)$/i.test(cleanPath)) {
          const githubUrl = `https://github.com/${parsed.owner}/${parsed.repo}/blob/${encodeURIComponent(branch)}/${normalized}`;
          return `[${text}](${githubUrl}${titlePart})`;
        }

        return match;
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
