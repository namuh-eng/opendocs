/**
 * Page utilities — path normalization, validation, tree building.
 */

/** Normalize a page path: lowercase, trim slashes, collapse slashes. */
export function normalizePath(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

/** Extract the title from a path segment (last segment, kebab → title case). */
export function titleFromPath(path: string): string {
  const segments = normalizePath(path).split("/");
  const last = segments[segments.length - 1] || "";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Validate a page path. Returns error string or null if valid. */
export function validatePagePath(path: string): string | null {
  const normalized = normalizePath(path);
  if (!normalized) return "Page path is required";
  if (normalized.length > 512) return "Path must be at most 512 characters";
  if (!/^[a-z0-9][a-z0-9/._-]*$/.test(normalized)) {
    return "Path must start with a letter or number and contain only lowercase letters, numbers, hyphens, underscores, dots, and slashes";
  }
  if (normalized.includes("..")) return "Path must not contain '..'";
  return null;
}

/** Validate a page title. Returns error string or null if valid. */
export function validatePageTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Page title is required";
  if (trimmed.length < 1) return "Title must be at least 1 character";
  if (trimmed.length > 256) return "Title must be at most 256 characters";
  return null;
}

/** Validate a create-page request body. */
export function validateCreatePageRequest(body: unknown):
  | {
      valid: true;
      path: string;
      title: string;
      content?: string;
      description?: string;
    }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const raw = body as Record<string, unknown>;

  // Path
  if (typeof raw.path !== "string") {
    return { valid: false, error: "Page path is required" };
  }
  const normalizedPath = normalizePath(raw.path);
  const pathError = validatePagePath(normalizedPath);
  if (pathError) return { valid: false, error: pathError };

  // Title
  if (typeof raw.title !== "string") {
    return { valid: false, error: "Page title is required" };
  }
  const titleError = validatePageTitle(raw.title);
  if (titleError) return { valid: false, error: titleError };

  const result: {
    valid: true;
    path: string;
    title: string;
    content?: string;
    description?: string;
  } = {
    valid: true,
    path: normalizedPath,
    title: raw.title.trim(),
  };

  if (typeof raw.content === "string") {
    result.content = raw.content;
  }

  if (typeof raw.description === "string") {
    result.description = raw.description.trim();
  }

  return result;
}

/** Validate an update-page request body. */
export function validateUpdatePageRequest(
  body: unknown,
):
  | { valid: true; fields: Record<string, unknown> }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const raw = body as Record<string, unknown>;
  const fields: Record<string, unknown> = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== "string") {
      return { valid: false, error: "Title must be a string" };
    }
    const titleError = validatePageTitle(raw.title);
    if (titleError) return { valid: false, error: titleError };
    fields.title = raw.title.trim();
  }

  if (raw.path !== undefined) {
    if (typeof raw.path !== "string") {
      return { valid: false, error: "Path must be a string" };
    }
    const normalizedPath = normalizePath(raw.path);
    const pathError = validatePagePath(normalizedPath);
    if (pathError) return { valid: false, error: pathError };
    fields.path = normalizedPath;
  }

  if (raw.content !== undefined) {
    if (typeof raw.content !== "string") {
      return { valid: false, error: "Content must be a string" };
    }
    fields.content = raw.content;
  }

  if (raw.description !== undefined) {
    if (typeof raw.description !== "string") {
      return { valid: false, error: "Description must be a string" };
    }
    fields.description = raw.description.trim();
  }

  if (raw.isPublished !== undefined) {
    if (typeof raw.isPublished !== "boolean") {
      return { valid: false, error: "isPublished must be a boolean" };
    }
    fields.isPublished = raw.isPublished;
  }

  if (raw.frontmatter !== undefined) {
    if (typeof raw.frontmatter !== "object" || raw.frontmatter === null) {
      return { valid: false, error: "frontmatter must be an object" };
    }
    fields.frontmatter = raw.frontmatter;
  }

  if (Object.keys(fields).length === 0) {
    return { valid: false, error: "No fields to update" };
  }

  return { valid: true, fields };
}

/** A node in the file tree. */
export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children: TreeNode[];
  pageId?: string;
  title?: string;
}

/** Build a tree structure from flat page paths. */
export function buildPageTree(
  pages: Array<{ id: string; path: string; title: string }>,
): TreeNode[] {
  const root: TreeNode[] = [];

  for (const page of pages) {
    const segments = page.path.split("/");
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      const pathSoFar = segments.slice(0, i + 1).join("/");

      let existing = current.find((n) => n.name === segment);

      if (!existing) {
        existing = {
          name: segment,
          path: pathSoFar,
          type: isLast ? "file" : "folder",
          children: [],
        };
        if (isLast) {
          existing.pageId = page.id;
          existing.title = page.title;
        }
        current.push(existing);
      } else if (isLast) {
        // Upgrade folder to file if we found an existing folder node
        existing.type = "file";
        existing.pageId = page.id;
        existing.title = page.title;
      }

      current = existing.children;
    }
  }

  // Sort: folders first, then alphabetically
  function sortTree(nodes: TreeNode[]): void {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      sortTree(node.children);
    }
  }
  sortTree(root);

  return root;
}
