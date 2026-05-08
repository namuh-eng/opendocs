/**
 * Editor collaboration utilities — comments, suggestions, branches
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommentThread {
  id: string;
  pageId: string;
  userId: string;
  userName?: string;
  content: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
}

export interface Suggestion {
  id: string;
  pageId: string;
  userId: string;
  userName?: string;
  diff: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface SuggestionDiff {
  originalText: string;
  suggestedText: string;
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateCommentContent(content: string): string | null {
  if (!content || content.trim().length === 0) {
    return "Comment content is required";
  }
  if (content.length > 5000) {
    return "Comment must be under 5000 characters";
  }
  return null;
}

export function validateSuggestionDiff(diff: string): string | null {
  if (!diff || diff.trim().length === 0) {
    return "Suggestion diff is required";
  }
  if (diff.length > 50000) {
    return "Suggestion diff must be under 50000 characters";
  }
  return null;
}

export function validateBranchName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Branch name is required";
  }
  if (name.length > 256) {
    return "Branch name must be under 256 characters";
  }
  // Git branch name rules
  if (/\.\./.test(name)) {
    return "Branch name cannot contain '..'";
  }
  if (/^[.\-/]|[.\-/]$/.test(name)) {
    return "Branch name cannot start or end with '.', '-', or '/'";
  }
  if (/[\s~^:?*[\]\\]/.test(name)) {
    return "Branch name contains invalid characters";
  }
  if (/\/\//.test(name)) {
    return "Branch name cannot contain consecutive slashes";
  }
  return null;
}

// ── Diff helpers ─────────────────────────────────────────────────────────────

export function parseSuggestionDiff(diff: string): SuggestionDiff {
  const parts = diff.split("\n---\n");
  return {
    originalText: parts[0] ?? "",
    suggestedText: parts[1] ?? parts[0] ?? "",
  };
}

export function createSuggestionDiff(
  originalText: string,
  suggestedText: string,
): string {
  return `${originalText}\n---\n${suggestedText}`;
}

// ── Comment threading ────────────────────────────────────────────────────────

interface FlatComment {
  id: string;
  pageId: string;
  userId: string;
  parentId: string | null;
  content: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export function buildCommentThreads(
  flatComments: FlatComment[],
  userMap?: Map<string, string>,
): CommentThread[] {
  const topLevel = flatComments.filter((c) => !c.parentId);
  const repliesMap = new Map<string, FlatComment[]>();

  for (const c of flatComments) {
    if (c.parentId) {
      const existing = repliesMap.get(c.parentId) ?? [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  }

  return topLevel.map((c) => ({
    id: c.id,
    pageId: c.pageId,
    userId: c.userId,
    userName: userMap?.get(c.userId),
    content: c.content,
    resolved: c.resolved,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    replies: (repliesMap.get(c.id) ?? [])
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: userMap?.get(r.userId),
        content: r.content,
        createdAt: r.createdAt,
      })),
  }));
}

// ── Role checks ──────────────────────────────────────────────────────────────

export type OrgRole = "admin" | "editor" | "viewer";

export function canResolveComment(role: OrgRole): boolean {
  return role === "admin" || role === "editor";
}

export function canManageSuggestions(role: OrgRole): boolean {
  return role === "admin" || role === "editor";
}

export function canCreateBranch(role: OrgRole): boolean {
  return role === "admin" || role === "editor";
}

// ── Relative time formatting ─────────────────────────────────────────────────

export function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
