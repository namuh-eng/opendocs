"use client";

import { CommentsSidebar } from "@/components/editor/comments-sidebar";
import { ConfigsPanel } from "@/components/editor/configs-panel";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { PageSettingsPanel } from "@/components/editor/page-settings-panel";
import { SuggestionsPanel } from "@/components/editor/suggestions-panel";
import { TocPanel } from "@/components/editor/toc-panel";
import {
  VisualEditor,
  type VisualEditorHandle,
} from "@/components/editor/visual-editor";
import { EmptyState } from "@/components/empty-state";
import type { EditorMode, MdxSnippetKey } from "@/lib/editor";
import {
  createAutoSave,
  extractFrontmatter,
  extractToc,
  insertSnippetAtCursor,
  mdxSnippets,
  serializeFrontmatter,
} from "@/lib/editor";
import { editorEmptyState } from "@/lib/empty-states";
import type { TreeNode } from "@/lib/pages";
import { buildPageTree } from "@/lib/pages";
import { clsx } from "clsx";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface PageData {
  id: string;
  path: string;
  title: string;
  description: string | null;
  content: string;
  isPublished: boolean;
  frontmatter: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface PageListItem {
  id: string;
  path: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

type ActiveTab = "navigation" | "files" | "configurations";

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as {
      error?: string;
      message?: string;
    };
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}

// ── File Tree Node Component ─────────────────────────────────────────────

function TreeNodeItem({
  node,
  depth,
  selectedPageId,
  onSelectPage,
}: {
  node: TreeNode;
  depth: number;
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = node.type === "folder";
  const isSelected = node.pageId === selectedPageId;
  const canSelect = Boolean(node.pageId);

  return (
    <div>
      <div
        className={clsx(
          "flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm rounded-md transition-colors",
          isSelected
            ? "bg-emerald-600/20 text-emerald-400"
            : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isFolder ? (
          <>
            <button
              type="button"
              className="shrink-0 text-gray-500 hover:text-gray-300"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse section" : "Expand section"}
            >
              {expanded ? (
                <ChevronDown size={14} className="shrink-0" />
              ) : (
                <ChevronRight size={14} className="shrink-0" />
              )}
            </button>
            {expanded ? (
              <FolderOpen size={14} className="shrink-0 text-gray-500" />
            ) : (
              <Folder size={14} className="shrink-0 text-gray-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileText size={14} className="shrink-0 text-gray-500" />
          </>
        )}
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left"
          onClick={() => {
            if (canSelect && node.pageId) {
              onSelectPage(node.pageId);
              return;
            }

            if (isFolder) {
              setExpanded(!expanded);
            }
          }}
        >
          <span className="truncate">{node.title || node.name}</span>
        </button>
      </div>
      {isFolder && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create Page Modal ────────────────────────────────────────────────────

function CreatePageModal({
  onClose,
  onCreated,
  projectId,
}: {
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
}) {
  const [path, setPath] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, title, content: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create page");
        setSaving(false);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Create new page</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="page-path"
              className="block text-sm text-gray-400 mb-1.5"
            >
              Path
            </label>
            <input
              id="page-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. getting-started/quickstart"
              className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/[0.08] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="page-title"
              className="block text-sm text-gray-400 mb-1.5"
            >
              Title
            </label>
            <input
              id="page-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quickstart"
              className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/[0.08] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !path.trim() || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Creating..." : "Create page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────────────────────────

function DeletePageModal({
  page,
  onClose,
  onDeleted,
  projectId,
}: {
  page: { id: string; title: string; path: string };
  onClose: () => void;
  onDeleted: () => void;
  projectId: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/pages/${page.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted();
        onClose();
        return;
      }
      setError(await getErrorMessage(res, "Failed to delete page"));
      setDeleting(false);
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-2">Delete page</h2>
        <p className="text-sm text-gray-400 mb-4">
          Are you sure you want to delete{" "}
          <span className="text-white font-medium">{page.title}</span> (
          <code className="text-emerald-400 text-xs">{page.path}</code>)? This
          action cannot be undone.
        </p>
        {error ? <p className="text-sm text-red-400 mb-4">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Editor Page ─────────────────────────────────────────────────────

export default function EditorPage() {
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageData | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("navigation");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    path: string;
  } | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [actionError, setActionError] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [cursorPos, setCursorPos] = useState(0);
  const visualEditorRef = useRef<VisualEditorHandle | null>(null);

  // Auto-save setup
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);

  const doSave = useCallback(
    async (contentToSave: string) => {
      if (!projectId || !selectedPageId) return;
      setSaving(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/pages/${selectedPageId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: contentToSave }),
          },
        );
        if (!res.ok) {
          throw new Error(await getErrorMessage(res, "Failed to save page"));
        }
        setHasUnsavedChanges(false);
        setActionError("");
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to save page",
        );
      } finally {
        setSaving(false);
      }
    },
    [projectId, selectedPageId],
  );

  // Initialize auto-save
  useEffect(() => {
    autoSaveRef.current = createAutoSave(doSave, 2000);
    return () => {
      autoSaveRef.current?.cancel();
    };
  }, [doSave]);

  // Handle content changes with auto-save
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    setActionError("");
    autoSaveRef.current?.trigger(newContent);
  }, []);

  // Extract TOC from body
  const tocEntries = useMemo(() => {
    const { body } = extractFrontmatter(content);
    return extractToc(body);
  }, [content]);

  const visualBody = useMemo(() => extractFrontmatter(content).body, [content]);

  // Fetch the first project to get its ID
  useEffect(() => {
    async function fetchProject() {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects?.length > 0) {
        setProjectId(data.projects[0].id);
      }
      setLoading(false);
    }
    fetchProject();
  }, []);

  const fetchPages = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/pages`);
    const data = await res.json();
    if (data.pages) {
      setPages(data.pages);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Fetch selected page content
  useEffect(() => {
    if (!projectId || !selectedPageId) {
      setSelectedPage(null);
      return;
    }
    async function fetchPage() {
      const res = await fetch(
        `/api/projects/${projectId}/pages/${selectedPageId}`,
      );
      const data = await res.json();
      if (data.page) {
        setSelectedPage(data.page);
        setContent(data.page.content || "");
        setHasUnsavedChanges(false);
        setActionError("");
      }
    }
    fetchPage();
  }, [projectId, selectedPageId]);

  // Manual save
  async function handleSaveContent() {
    autoSaveRef.current?.cancel();
    await doSave(content);
  }

  // Save page settings
  async function handleSaveSettings(updates: Record<string, unknown>) {
    if (!projectId || !selectedPageId) return;
    const updateResponse = await fetch(
      `/api/projects/${projectId}/pages/${selectedPageId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      },
    );
    if (!updateResponse.ok) {
      setActionError(
        await getErrorMessage(updateResponse, "Failed to update page settings"),
      );
      return;
    }
    const res = await fetch(
      `/api/projects/${projectId}/pages/${selectedPageId}`,
    );
    if (!res.ok) {
      setActionError(await getErrorMessage(res, "Failed to refresh page"));
      return;
    }
    setActionError("");
    const data = await res.json();
    if (data.page) {
      setSelectedPage(data.page);
    }
    fetchPages();
  }

  // Toolbar formatting handlers
  function handleBold() {
    if (editorMode === "visual") {
      visualEditorRef.current?.toggleBold();
      return;
    }

    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      cursorPos,
      "**bold**",
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  function handleItalic() {
    if (editorMode === "visual") {
      visualEditorRef.current?.toggleItalic();
      return;
    }

    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      cursorPos,
      "*italic*",
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  function handleHeading() {
    if (editorMode === "visual") {
      visualEditorRef.current?.toggleHeading();
      return;
    }

    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      cursorPos,
      "## Heading",
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  function handleLink() {
    if (editorMode === "visual") {
      visualEditorRef.current?.insertLink();
      return;
    }

    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      cursorPos,
      "[Link text](https://example.com)",
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  function handleImage() {
    if (editorMode === "visual") {
      visualEditorRef.current?.insertImage();
      return;
    }

    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      cursorPos,
      "![Image alt](https://placehold.co/1200x630/png)",
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  function handleCodeBlock() {
    if (editorMode === "visual") {
      visualEditorRef.current?.insertCodeBlock();
      return;
    }

    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      cursorPos,
      mdxSnippets.codeBlock,
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  function handleInsertSnippet(key: MdxSnippetKey) {
    const snippet = mdxSnippets[key];
    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      cursorPos,
      snippet,
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  const tree: TreeNode[] = buildPageTree(
    pages.map((p) => ({ id: p.id, path: p.path, title: p.title })),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
        Loading editor...
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
        No project found. Create a project first.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-48px)]"
      data-testid="editor-page"
    >
      {/* Toolbar */}
      <EditorToolbar
        mode={editorMode}
        onModeChange={setEditorMode}
        onBold={handleBold}
        onItalic={handleItalic}
        onHeading={handleHeading}
        onLink={handleLink}
        onImage={handleImage}
        onCodeBlock={handleCodeBlock}
        onInsertSnippet={handleInsertSnippet}
        onToggleSettings={() => {
          setShowSettings(!showSettings);
          setShowComments(false);
          setShowSuggestions(false);
        }}
        onToggleComments={() => {
          setShowComments(!showComments);
          setShowSettings(false);
          setShowSuggestions(false);
        }}
        onToggleSuggestions={() => {
          setShowSuggestions(!showSuggestions);
          setShowSettings(false);
          setShowComments(false);
        }}
        onPublish={handleSaveContent}
        projectId={projectId}
        currentBranch={currentBranch}
        onBranchChange={setCurrentBranch}
        isSaving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Navigation / Files */}
        <div className="w-64 border-r border-white/[0.08] flex flex-col bg-[#0f0f0f] shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab("navigation")}
              className={clsx(
                "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
                activeTab === "navigation"
                  ? "text-white border-b-2 border-emerald-500"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              Navigation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("files")}
              className={clsx(
                "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
                activeTab === "files"
                  ? "text-white border-b-2 border-emerald-500"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              Files
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("configurations")}
              data-testid="configs-tab"
              className={clsx(
                "flex-1 px-2 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                activeTab === "configurations"
                  ? "text-white border-b-2 border-emerald-500"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              <Settings2 size={12} />
              Config
            </button>
          </div>

          {activeTab === "configurations" ? (
            <div className="flex-1 overflow-y-auto">
              <ConfigsPanel
                projectId={projectId}
                onClose={() => setActiveTab("navigation")}
              />
            </div>
          ) : (
            <>
              {/* Panel header with Add button */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === "navigation" ? "Navigation" : "File Explorer"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="p-1 rounded hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
                  aria-label="Add new page"
                  data-testid="add-page-btn"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Tree / File list */}
              <div className="flex-1 overflow-y-auto px-1 py-1">
                {activeTab === "navigation" ? (
                  tree.length > 0 ? (
                    <div data-testid="page-tree">
                      {tree.map((node) => (
                        <TreeNodeItem
                          key={node.path}
                          node={node}
                          depth={0}
                          selectedPageId={selectedPageId}
                          onSelectPage={setSelectedPageId}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-8 text-center text-sm text-gray-600">
                      No pages yet.{" "}
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="text-emerald-500 hover:underline"
                      >
                        Add new
                      </button>
                    </div>
                  )
                ) : (
                  <div data-testid="file-list">
                    {pages.map((page) => (
                      <button
                        type="button"
                        key={page.id}
                        onClick={() => setSelectedPageId(page.id)}
                        className={clsx(
                          "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md transition-colors",
                          selectedPageId === page.id
                            ? "bg-emerald-600/20 text-emerald-400"
                            : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
                        )}
                      >
                        <File size={14} className="shrink-0 text-gray-500" />
                        <span className="truncate">{page.path}</span>
                      </button>
                    ))}
                    {pages.length === 0 && (
                      <div className="px-3 py-8 text-center text-sm text-gray-600">
                        No files yet.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add new link at bottom */}
              <div className="border-t border-white/[0.08] p-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 rounded-md transition-colors"
                >
                  <Plus size={14} />
                  <span>Add new</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center: Editor content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPage ? (
            <>
              {/* Page header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08]">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h1
                      className="text-xl font-semibold text-white"
                      data-testid="page-title"
                    >
                      {selectedPage.title}
                    </h1>
                    <code className="text-xs text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded">
                      {selectedPage.path}
                    </code>
                    {selectedPage.isPublished && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 font-medium">
                        Published
                      </span>
                    )}
                  </div>
                  {actionError ? (
                    <p
                      className="mt-1 text-sm text-red-400"
                      data-testid="editor-action-error"
                    >
                      {actionError}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        id: selectedPage.id,
                        title: selectedPage.title,
                        path: selectedPage.path,
                      })
                    }
                    className="p-2 rounded-md text-gray-500 hover:bg-red-600/10 hover:text-red-400 transition-colors"
                    aria-label="Delete page"
                    data-testid="delete-page-btn"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContent}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50"
                    data-testid="save-content-btn"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              {/* Dual-mode editor */}
              <div className="flex-1 overflow-hidden">
                {editorMode === "visual" ? (
                  <VisualEditor
                    ref={visualEditorRef}
                    content={visualBody}
                    onChange={(newBody) => {
                      const { frontmatter } = extractFrontmatter(content);
                      handleContentChange(
                        serializeFrontmatter(frontmatter, newBody),
                      );
                    }}
                  />
                ) : (
                  <MarkdownEditor
                    value={content}
                    onChange={handleContentChange}
                    onCursorChange={setCursorPos}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              {pages.length === 0 ? (
                <EmptyState
                  icon={<FileText size={32} className="text-emerald-500" />}
                  title={editorEmptyState.title}
                  description={editorEmptyState.description}
                  action={{
                    label: editorEmptyState.ctaLabel,
                    onClick: () => setShowCreateModal(true),
                  }}
                />
              ) : (
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 text-gray-700" />
                  <p className="text-lg font-medium text-gray-400">
                    Select a page to edit
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a page from the sidebar or create a new one
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel: Settings, Comments, Suggestions, or TOC */}
        {selectedPage && showSettings && (
          <PageSettingsPanel
            settings={{
              title: selectedPage.title,
              path: selectedPage.path,
              description: selectedPage.description || "",
              isPublished: selectedPage.isPublished,
              frontmatter:
                (selectedPage.frontmatter as Record<string, unknown>) || {},
            }}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {selectedPage && showComments && (
          <CommentsSidebar
            pageId={selectedPageId}
            onClose={() => setShowComments(false)}
          />
        )}

        {selectedPage && showSuggestions && (
          <SuggestionsPanel
            pageId={selectedPageId}
            onClose={() => setShowSuggestions(false)}
          />
        )}

        {selectedPage &&
          !showSettings &&
          !showComments &&
          !showSuggestions &&
          tocEntries.length > 0 && (
            <div className="w-48 border-l border-white/[0.08] bg-[#0f0f0f] shrink-0 overflow-y-auto">
              <TocPanel entries={tocEntries} />
            </div>
          )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePageModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchPages();
          }}
        />
      )}

      {deleteTarget && (
        <DeletePageModal
          page={deleteTarget}
          projectId={projectId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            if (selectedPageId === deleteTarget.id) {
              setSelectedPageId(null);
              setSelectedPage(null);
            }
            fetchPages();
          }}
        />
      )}
    </div>
  );
}
