"use client";

import {
  type NavAnchor,
  type NavEntry,
  type NavGroup,
  type NavPage,
  type NavTab,
  type NavigationConfig,
  createAnchor,
  createGroup,
  createPage,
  createTab,
  findDuplicatePaths,
  labelToPath,
  mergeNavigation,
  moveItem,
  validateNavigation,
} from "@/lib/navigation";
import { clsx } from "clsx";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  GripVertical,
  Link,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ProjectData {
  id: string;
  orgId: string;
  settings: Record<string, unknown>;
}

// ── Add Entry Dropdown ───────────────────────────────────────────────────────

function AddEntryDropdown({
  onAdd,
}: {
  onAdd: (entry: NavEntry) => void;
}) {
  const [open, setOpen] = useState(false);

  const options: { label: string; type: string; description: string }[] = [
    { label: "Group", type: "group", description: "Section with nested pages" },
    { label: "Tab", type: "tab", description: "Top-level navigation tab" },
    { label: "Anchor", type: "anchor", description: "External link" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="add-entry-btn"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/[0.12] px-3 py-2 text-sm text-gray-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
      >
        <Plus size={14} />
        Add new
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-white/[0.08] bg-[#1e1e1e] py-1 shadow-xl"
          data-testid="add-entry-dropdown"
        >
          {options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              data-testid={`add-${opt.type}`}
              onClick={() => {
                if (opt.type === "group") onAdd(createGroup("New group"));
                else if (opt.type === "tab") onAdd(createTab("New tab", "/"));
                else onAdd(createAnchor("New link", "https://"));
                setOpen(false);
              }}
              className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="text-sm text-white">{opt.label}</span>
              <span className="text-xs text-gray-500">{opt.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Page Modal ───────────────────────────────────────────────────────────

function AddPageModal({
  onAdd,
  onClose,
}: {
  onAdd: (page: NavPage) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [autoPath, setAutoPath] = useState(true);

  const handleLabelChange = (v: string) => {
    setLabel(v);
    if (autoPath) setPath(labelToPath(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const finalPath = path || labelToPath(label);
    onAdd(createPage(label.trim(), finalPath));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-testid="add-page-modal"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Add page</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="page-label"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Label
            </label>
            <input
              id="page-label"
              data-testid="page-label-input"
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Getting Started"
              className="w-full rounded-lg border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="page-path"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Path
            </label>
            <input
              id="page-path"
              data-testid="page-path-input"
              type="text"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setAutoPath(false);
              }}
              placeholder="e.g. getting-started"
              className="w-full rounded-lg border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="add-page-submit"
            disabled={!label.trim()}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Add page
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Edit Entry Modal ─────────────────────────────────────────────────────────

function EditEntryModal({
  entry,
  onSave,
  onClose,
}: {
  entry: NavEntry;
  onSave: (updated: NavEntry) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(entry.label);
  const [href, setHref] = useState(
    entry.type === "tab"
      ? (entry.href ?? "")
      : entry.type === "anchor"
        ? entry.href
        : "",
  );
  const [icon, setIcon] = useState(
    entry.type === "group" || entry.type === "anchor" ? (entry.icon ?? "") : "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    if (entry.type === "group") {
      onSave({ ...entry, label: label.trim(), icon: icon || undefined });
    } else if (entry.type === "tab") {
      onSave({ ...entry, label: label.trim(), href: href || undefined });
    } else if (entry.type === "anchor") {
      onSave({ ...entry, label: label.trim(), href, icon: icon || undefined });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-testid="edit-entry-modal"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Edit {entry.type}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="edit-label"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Label
            </label>
            <input
              id="edit-label"
              data-testid="edit-label-input"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          {(entry.type === "tab" || entry.type === "anchor") && (
            <div>
              <label
                htmlFor="edit-href"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                URL / Path
              </label>
              <input
                id="edit-href"
                data-testid="edit-href-input"
                type="text"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder={entry.type === "anchor" ? "https://..." : "/docs"}
                className="w-full rounded-lg border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500"
              />
            </div>
          )}
          {(entry.type === "group" || entry.type === "anchor") && (
            <div>
              <label
                htmlFor="edit-icon"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Icon (optional)
              </label>
              <input
                id="edit-icon"
                data-testid="edit-icon-input"
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. book, file-text"
                className="w-full rounded-lg border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="edit-entry-submit"
            disabled={!label.trim()}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Page Row ─────────────────────────────────────────────────────────────────

function PageRow({
  page,
  groupIndex,
  pageIndex,
  totalPages,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  page: NavPage;
  groupIndex: number;
  pageIndex: number;
  totalPages: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
      data-testid={`page-${groupIndex}-${pageIndex}`}
    >
      <div className="flex items-center gap-1 text-gray-600">
        <button
          type="button"
          title="Move up"
          disabled={pageIndex === 0}
          onClick={onMoveUp}
          className="rounded p-0.5 hover:bg-white/[0.08] disabled:opacity-30"
          data-testid={`page-up-${groupIndex}-${pageIndex}`}
        >
          <ChevronRight size={12} className="-rotate-90" />
        </button>
        <button
          type="button"
          title="Move down"
          disabled={pageIndex === totalPages - 1}
          onClick={onMoveDown}
          className="rounded p-0.5 hover:bg-white/[0.08] disabled:opacity-30"
          data-testid={`page-down-${groupIndex}-${pageIndex}`}
        >
          <ChevronRight size={12} className="rotate-90" />
        </button>
      </div>
      <FileText size={14} className="shrink-0 text-gray-500" />
      <span className="flex-1 truncate text-sm text-gray-300">
        {page.label}
      </span>
      <span className="hidden text-xs text-gray-600 group-hover:inline">
        {page.path}
      </span>
      <button
        type="button"
        title="Remove page"
        onClick={onRemove}
        className="rounded p-1 text-gray-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        data-testid={`page-remove-${groupIndex}-${pageIndex}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  index,
  totalEntries,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  entry: NavEntry;
  index: number;
  totalEntries: number;
  onUpdate: (updated: NavEntry) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);

  const typeIcon =
    entry.type === "group" ? (
      <FolderOpen size={15} className="text-emerald-500" />
    ) : entry.type === "tab" ? (
      <FileText size={15} className="text-blue-400" />
    ) : (
      <Link size={15} className="text-purple-400" />
    );

  const typeLabel =
    entry.type === "group" ? "Group" : entry.type === "tab" ? "Tab" : "Anchor";

  const handleAddPage = (page: NavPage) => {
    if (entry.type === "group") {
      onUpdate({ ...entry, pages: [...entry.pages, page] });
    }
  };

  const handleRemovePage = (pageIndex: number) => {
    if (entry.type === "group") {
      onUpdate({
        ...entry,
        pages: entry.pages.filter((_, i) => i !== pageIndex),
      });
    }
  };

  const handleMovePage = (from: number, to: number) => {
    if (entry.type === "group") {
      onUpdate({ ...entry, pages: moveItem(entry.pages, from, to) });
    }
  };

  return (
    <>
      <div
        className="rounded-lg border border-white/[0.06] bg-[#161616]"
        data-testid={`entry-${index}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex items-center gap-1 text-gray-600">
            <button
              type="button"
              title="Move up"
              disabled={index === 0}
              onClick={onMoveUp}
              className="rounded p-0.5 hover:bg-white/[0.08] disabled:opacity-30"
              data-testid={`entry-up-${index}`}
            >
              <ChevronRight size={14} className="-rotate-90" />
            </button>
            <button
              type="button"
              title="Move down"
              disabled={index === totalEntries - 1}
              onClick={onMoveDown}
              className="rounded p-0.5 hover:bg-white/[0.08] disabled:opacity-30"
              data-testid={`entry-down-${index}`}
            >
              <ChevronRight size={14} className="rotate-90" />
            </button>
          </div>

          <GripVertical size={14} className="text-gray-600" />

          {entry.type === "group" && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 hover:text-white"
              data-testid={`entry-toggle-${index}`}
            >
              {expanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          )}

          {typeIcon}

          <span className="flex-1 truncate text-sm font-medium text-white">
            {entry.label}
          </span>

          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gray-500">
            {typeLabel}
          </span>

          {entry.type === "anchor" && (
            <ExternalLink size={12} className="text-gray-600" />
          )}

          <button
            type="button"
            title="Edit"
            onClick={() => setShowEdit(true)}
            className="rounded p-1 text-gray-500 hover:bg-white/[0.06] hover:text-white"
            data-testid={`entry-edit-${index}`}
          >
            <Pencil size={13} />
          </button>

          <button
            type="button"
            title="Remove"
            onClick={onRemove}
            className="rounded p-1 text-gray-500 hover:bg-white/[0.06] hover:text-red-400"
            data-testid={`entry-remove-${index}`}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Group pages */}
        {entry.type === "group" && expanded && (
          <div className="border-t border-white/[0.04] px-3 py-2">
            {entry.pages.length === 0 ? (
              <p className="py-2 text-center text-xs text-gray-600">
                No pages yet
              </p>
            ) : (
              <div className="space-y-0.5">
                {entry.pages.map((page, pi) => (
                  <PageRow
                    key={`${page.path}-${pi}`}
                    page={page}
                    groupIndex={index}
                    pageIndex={pi}
                    totalPages={entry.pages.length}
                    onMoveUp={() => handleMovePage(pi, pi - 1)}
                    onMoveDown={() => handleMovePage(pi, pi + 1)}
                    onRemove={() => handleRemovePage(pi)}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAddPage(true)}
              className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:text-emerald-400"
              data-testid={`add-page-${index}`}
            >
              <Plus size={12} />
              Add page
            </button>
          </div>
        )}

        {/* Tab/anchor href display */}
        {(entry.type === "tab" || entry.type === "anchor") && (
          <div className="border-t border-white/[0.04] px-3 py-1.5">
            <span className="text-xs text-gray-600">
              {entry.type === "tab"
                ? (entry as NavTab).href || "(no href)"
                : (entry as NavAnchor).href}
            </span>
          </div>
        )}
      </div>

      {showEdit && (
        <EditEntryModal
          entry={entry}
          onSave={onUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showAddPage && (
        <AddPageModal
          onAdd={handleAddPage}
          onClose={() => setShowAddPage(false)}
        />
      )}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function NavigationSettingsPage() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [nav, setNav] = useState<NavigationConfig>({ entries: [] });

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects?.length > 0) {
          const p = data.projects[0];
          setProject(p);
          const existing =
            (p.settings as Record<string, unknown>)?.navigation ?? {};
          setNav(mergeNavigation(existing as Partial<NavigationConfig>));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateEntry = useCallback((index: number, updated: NavEntry) => {
    setNav((prev) => ({
      entries: prev.entries.map((e, i) => (i === index ? updated : e)),
    }));
  }, []);

  const removeEntry = useCallback((index: number) => {
    setNav((prev) => ({
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  }, []);

  const moveEntry = useCallback((from: number, to: number) => {
    setNav((prev) => ({
      entries: moveItem(prev.entries, from, to),
    }));
  }, []);

  const addEntry = useCallback((entry: NavEntry) => {
    setNav((prev) => ({ entries: [...prev.entries, entry] }));
  }, []);

  const handleSave = async () => {
    if (!project) return;

    const validation = validateNavigation(nav);
    if (!validation.valid) {
      setMessage({ type: "error", text: validation.error });
      return;
    }

    const duplicates = findDuplicatePaths(nav);
    if (duplicates.length > 0) {
      setMessage({
        type: "error",
        text: `Duplicate paths: ${duplicates.join(", ")}`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...((project.settings as Record<string, unknown>) ?? {}),
            navigation: nav,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
        setSaving(false);
        return;
      }

      const data = await res.json();
      setProject(data.project);
      setMessage({ type: "success", text: "Navigation saved" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">No project found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">Settings / Navigation</div>
      <h1 className="mb-2 text-xl font-semibold text-white">Navigation</h1>
      <p className="mb-6 text-sm text-gray-500">
        Configure the docs.json navigation structure. Add groups, pages, tabs,
        and anchors. Drag to reorder. Changes are reflected on your docs site
        after the next deploy.
      </p>

      {/* Entry list */}
      <div className="space-y-3" data-testid="nav-entries">
        {nav.entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] py-8 text-center">
            <FolderOpen size={24} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500">No navigation entries yet</p>
            <p className="text-xs text-gray-600">
              Add groups, tabs, or anchors to build your docs navigation
            </p>
          </div>
        ) : (
          nav.entries.map((entry, i) => (
            <EntryCard
              key={`${entry.type}-${entry.label}-${i}`}
              entry={entry}
              index={i}
              totalEntries={nav.entries.length}
              onUpdate={(updated) => updateEntry(i, updated)}
              onRemove={() => removeEntry(i)}
              onMoveUp={() => moveEntry(i, i - 1)}
              onMoveDown={() => moveEntry(i, i + 1)}
            />
          ))
        )}
      </div>

      {/* Add entry */}
      <div className="mt-4">
        <AddEntryDropdown onAdd={addEntry} />
      </div>

      {/* Summary */}
      <div className="mt-6 flex items-center gap-4 text-xs text-gray-600">
        <span>{nav.entries.length} entries</span>
        <span>
          {nav.entries.filter((e) => e.type === "group").length} groups
        </span>
        <span>
          {nav.entries.reduce(
            (t, e) => t + (e.type === "group" ? e.pages.length : 0),
            0,
          )}{" "}
          pages
        </span>
      </div>

      {/* Message */}
      {message && (
        <p
          data-testid="nav-message"
          className={clsx(
            "mt-4 text-sm",
            message.type === "success" ? "text-emerald-400" : "text-red-400",
          )}
        >
          {message.text}
        </p>
      )}

      {/* Save */}
      <button
        type="button"
        data-testid="save-nav-btn"
        disabled={saving}
        onClick={handleSave}
        className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
