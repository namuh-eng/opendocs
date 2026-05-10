"use client";

import { CommentsSidebar } from "@/components/editor/comments-sidebar";
import { ConfigsPanel } from "@/components/editor/configs-panel";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { PageAnalyticsPanel } from "@/components/editor/page-analytics-panel";
import { PageSettingsPanel } from "@/components/editor/page-settings-panel";
import { SuggestionsPanel } from "@/components/editor/suggestions-panel";
import { TocPanel } from "@/components/editor/toc-panel";
import {
  VisualEditor,
  type VisualEditorHandle,
} from "@/components/editor/visual-editor";
import { EmptyState } from "@/components/empty-state";
import { useActiveProject } from "@/hooks/use-active-project";
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
import { useRouter } from "next/navigation";
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

interface ActiveEditorProject {
  id: string;
  subdomain?: string | null;
  customDomain?: string | null;
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

function CreatePageModal({
  onClose,
  onCreated,
  projectId,
}: {
  onClose: () => void;
  onCreated: (pageId: string) => void;
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
      onCreated(data.page.id);
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

export default function EditorPage() {
  const router = useRouter();
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
  const { project, loading } = useActiveProject<ActiveEditorProject>();
  const projectId = project?.id ?? null;
  const [pagesLoading, setPagesLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [actionError, setActionError] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const visualEditorRef = useRef<VisualEditorHandle | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);

  const siteUrl = useMemo(() => {
    if (!project) return undefined;
    if (project.customDomain) return `https://${project.customDomain}`;
    if (project.subdomain)
      return `https://${project.subdomain}.opendocs.namuh.co`;
    return undefined;
  }, [project]);

  const previewUrl = useMemo(() => {
    if (!project?.subdomain || !selectedPage?.path) return undefined;
    return `/docs/${project.subdomain}/${selectedPage.path}`;
  }, [project, selectedPage]);

  const doSave = useCallback(
    async (contentToSave: string) => {
      if (!projectId || !selectedPageId) return false;
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
        return true;
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to save page",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [projectId, selectedPageId],
  );

  useEffect(() => {
    autoSaveRef.current = createAutoSave(async (value) => {
      await doSave(value);
    }, 2000);
    return () => {
      autoSaveRef.current?.cancel();
    };
  }, [doSave]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    setActionError("");
    autoSaveRef.current?.trigger(newContent);
  }, []);

  const tocEntries = useMemo(() => {
    const { body } = extractFrontmatter(content);
    return extractToc(body);
  }, [content]);

  const visualBody = useMemo(() => extractFrontmatter(content).body, [content]);

  const fetchPages = useCallback(async () => {
    if (!projectId) {
      setPagesLoading(false);
      return;
    }

    const res = await fetch(`/api/projects/${projectId}/pages`);
    const data = await res.json();
    if (data.pages) {
      setPages(data.pages);
      setSelectedPageId((current) => {
        if (data.pages.length === 0) {
          return null;
        }

        if (
          current &&
          data.pages.some((page: PageListItem) => page.id === current)
        ) {
          return current;
        }

        return data.pages[0].id;
      });
    }
    setPagesLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    if (!projectId || !selectedPageId) {
      setSelectedPage(null);
      setCursorPos(null);
      return;
    }
    async function fetchPage() {
      const res = await fetch(
        `/api/projects/${projectId}/pages/${selectedPageId}`,
      );
      const data = await res.json();
      if (data.page) {
        const initialContent = data.page.content || "";
        setSelectedPage(data.page);
        setContent(initialContent);
        setCursorPos(initialContent.length);
        setHasUnsavedChanges(false);
        setActionError("");
      }
    }
    fetchPage();
  }, [projectId, selectedPageId]);

  async function handleSaveContent() {
    autoSaveRef.current?.cancel();
    await doSave(content);
  }

  async function handlePublish() {
    if (!projectId || publishing) return;
    autoSaveRef.current?.cancel();
    setPublishing(true);
    setActionError("");

    try {
      if (hasUnsavedChanges) {
        const saved = await doSave(content);
        if (!saved) return;
      }

      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitMessage: selectedPage
            ? `Update ${selectedPage.path}`
            : "Manual Update",
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to trigger deployment"),
        );
      }

      setHasUnsavedChanges(false);
      router.push("/dashboard");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to publish changes",
      );
    } finally {
      setPublishing(false);
    }
  }

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

  function getInsertCursorPos() {
    return cursorPos ?? content.length;
  }

  function handleBold() {
    if (editorMode === "visual") {
      visualEditorRef.current?.toggleBold();
      return;
    }

    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      getInsertCursorPos(),
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
      getInsertCursorPos(),
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
      getInsertCursorPos(),
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
      getInsertCursorPos(),
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
      getInsertCursorPos(),
      "![Image alt](https://placehold.co/1200x630/png)",
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  function handleSnippet(key: MdxSnippetKey) {
    const snippet = mdxSnippets[key];
    const { newText, newCursorPos } = insertSnippetAtCursor(
      content,
      getInsertCursorPos(),
      snippet,
    );
    setContent(newText);
    setCursorPos(newCursorPos);
    setHasUnsavedChanges(true);
    autoSaveRef.current?.trigger(newText);
  }

  const pageTree = useMemo(() => buildPageTree(pages), [pages]);

  if (loading || pagesLoading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        icon={<FileText className="text-emerald-500" />}
        title={editorEmptyState.title}
        description={editorEmptyState.description}
        action={{
          label: editorEmptyState.ctaLabel,
          onClick: () => setShowCreateModal(true),
        }}
      />
    );
  }

  return (
    <div className="h-screen flex bg-[#0f0f0f] text-white overflow-hidden">
      <aside className="w-64 border-r border-white/[0.08] bg-[#111111] flex flex-col">
        <div className="p-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <File size={18} className="text-emerald-400" />
              <h1 className="font-semibold">Editor</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors"
              title="Create new page"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#0f0f0f] p-1">
            {[
              { key: "navigation", label: "Navigation", icon: FolderOpen },
              { key: "files", label: "Files", icon: FileText },
              { key: "configurations", label: "Configs", icon: Settings2 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as ActiveTab)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeTab === key
                    ? "bg-white/[0.08] text-white"
                    : "text-gray-500 hover:text-gray-300",
                )}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === "navigation" && (
            <div className="space-y-1">
              {pageTree.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 py-4">No pages yet</p>
              ) : (
                pageTree.map((node) => (
                  <TreeNodeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPageId={selectedPageId}
                    onSelectPage={setSelectedPageId}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-1">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={clsx(
                    "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    selectedPageId === page.id
                      ? "bg-emerald-600/20 text-emerald-400"
                      : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPageId(page.id)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  >
                    <FileText size={14} className="shrink-0" />
                    <span className="truncate">{page.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        id: page.id,
                        title: page.title,
                        path: page.path,
                      })
                    }
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-600/20 hover:text-red-400 transition-all"
                    title="Delete page"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "configurations" && (
            <ConfigsPanel
              projectId={projectId}
              currentBranch={currentBranch}
              onBranchChange={setCurrentBranch}
            />
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {selectedPage ? (
          <>
            <EditorToolbar
              mode={editorMode}
              onModeChange={setEditorMode}
              onBold={handleBold}
              onItalic={handleItalic}
              onHeading={handleHeading}
              onLink={handleLink}
              onImage={handleImage}
              onSave={handleSaveContent}
              isSaving={saving || publishing}
              hasUnsavedChanges={hasUnsavedChanges}
              siteUrl={siteUrl}
              previewUrl={previewUrl}
              projectId={projectId}
              currentBranch={currentBranch}
              onBranchChange={setCurrentBranch}
              onPublish={handlePublish}
              showSettings={showSettings}
              onToggleSettings={() => setShowSettings(!showSettings)}
              showComments={showComments}
              onToggleComments={() => setShowComments(!showComments)}
              showSuggestions={showSuggestions}
              onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
              onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
              onInsertSnippet={handleSnippet}
            />

            <div className="flex-1 flex min-h-0">
              <div className="flex-1 min-w-0 flex flex-col bg-[#0c0c0c]">
                {actionError && (
                  <div className="px-4 py-2 border-b border-red-500/20 bg-red-500/5 text-sm text-red-400">
                    {actionError}
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  {editorMode === "visual" ? (
                    <VisualEditor
                      ref={visualEditorRef}
                      content={visualBody}
                      onChange={handleContentChange}
                    />
                  ) : (
                    <MarkdownEditor
                      value={content}
                      onChange={handleContentChange}
                      onCursorChange={setCursorPos}
                    />
                  )}
                </div>
              </div>

              <TocPanel entries={tocEntries} />

              {showSuggestions && (
                <SuggestionsPanel
                  pageId={selectedPage.id}
                  onClose={() => setShowSuggestions(false)}
                />
              )}

              {showComments && (
                <CommentsSidebar
                  pageId={selectedPage.id}
                  onClose={() => setShowComments(false)}
                />
              )}

              {showAnalytics && (
                <PageAnalyticsPanel pagePath={selectedPage.path} />
              )}

              {showSettings && (
                <PageSettingsPanel
                  settings={selectedPage}
                  onSave={handleSaveSettings}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<FileText className="text-emerald-500" />}
            title={editorEmptyState.title}
            description={editorEmptyState.description}
            action={{
              label: editorEmptyState.ctaLabel,
              onClick: () => setShowCreateModal(true),
            }}
          />
        )}
      </main>

      {showCreateModal && projectId && (
        <CreatePageModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={(pageId) => {
            fetchPages();
            setSelectedPageId(pageId);
          }}
        />
      )}

      {deleteTarget && projectId && (
        <DeletePageModal
          page={deleteTarget}
          projectId={projectId}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            if (selectedPageId === deleteTarget.id) {
              setSelectedPageId(null);
            }
            fetchPages();
          }}
        />
      )}
    </div>
  );
}
