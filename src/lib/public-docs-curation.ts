export interface PublicDocsCurationPage {
  path?: string | null;
  title?: string | null;
  frontmatter?: Record<string, unknown> | null;
}

const INTERNAL_PATH_PREFIXES = [
  ".claude/",
  ".codex/",
  ".cursor/",
  ".github/",
  ".omx/",
  "agent_docs/",
  "memory/",
  "node_modules/",
  "private/",
  "ralph/",
  "ralph-hardening/",
  "target-doc/",
  "target-docs/",
  "target_docs/",
];

const INTERNAL_EXACT_PATHS = new Set([
  ".claude",
  "agents",
  "claude",
  "memory",
  "soul",
  "tools",
]);

const INTERNAL_ARTIFACT_PATTERNS = [
  /(?:^|[-_/\s])ralph(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])target[-_\s]?docs?(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])qa[-_\s]?loop(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])build[-_\s]?loop(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])inspect[-_\s]?loop(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])onboard[-_\s]?prompt(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])build[-_\s]?prompt(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])inspect[-_\s]?prompt(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])qa[-_\s]?prompt(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])code[-_\s]?duplication[-_\s]?fix[-_\s]?prompt(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])build[-_\s]?guide(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])build[-_\s]?spec(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])ever[-_\s]?cli(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])browser[-_\s]?control(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])site[-_\s]?map(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])documentation[-_\s]?index(?:[-_/\s]|$)/i,
  /(?:^|[-_/\s])generated[-_\s]?(?:artifact|dump|output)s?(?:[-_/\s]|$)/i,
];

export function normalizePublicDocsPath(path?: string | null): string {
  return (path ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\.(md|mdx)$/i, "")
    .toLowerCase();
}

function curationOverride(frontmatter?: Record<string, unknown> | null) {
  if (!frontmatter) return null;

  if (
    frontmatter.publicDocs === true ||
    frontmatter.opendocsPublic === true ||
    frontmatter.curation === "public" ||
    frontmatter.curation === "include"
  ) {
    return true;
  }

  if (
    frontmatter.publicDocs === false ||
    frontmatter.internal === true ||
    frontmatter.private === true ||
    frontmatter.curation === "internal" ||
    frontmatter.curation === "exclude"
  ) {
    return false;
  }

  return null;
}

export function isInternalPublicDocsPath(path?: string | null): boolean {
  const normalized = normalizePublicDocsPath(path);
  if (!normalized) return false;

  if (INTERNAL_EXACT_PATHS.has(normalized)) return true;
  if (INTERNAL_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  return INTERNAL_ARTIFACT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isInternalPublicDocsTitle(title?: string | null): boolean {
  const normalized = (title ?? "").trim();
  if (!normalized) return false;
  return INTERNAL_ARTIFACT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isPublicDocsVisiblePage(page: PublicDocsCurationPage): boolean {
  const override = curationOverride(page.frontmatter);
  if (override !== null) return override;

  if (isInternalPublicDocsPath(page.path)) return false;
  if (isInternalPublicDocsTitle(page.title)) return false;

  return true;
}

export function filterPublicDocsVisiblePages<T extends PublicDocsCurationPage>(
  pageList: T[],
): T[] {
  return pageList.filter(isPublicDocsVisiblePage);
}

export function isBrokenGeneratedBadge(
  label?: string | null,
  url?: string | null,
) {
  const haystack = `${label ?? ""} ${url ?? ""}`
    .toLowerCase()
    .replace(/%20/g, " ")
    .replace(/[-_]+/g, " ");

  return (
    haystack.includes("repo not found") ||
    haystack.includes("repository not found") ||
    /\binvalid\s+(?:badge|repo|repository)\b/.test(haystack) ||
    /\bbadge\s+invalid\b/.test(haystack)
  );
}
