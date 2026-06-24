"use client";

import * as Popover from "@radix-ui/react-popover";
import { clsx } from "clsx";
import { Check, ChevronDown, GitBranch, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Branch } from "@/lib/collaboration";

interface BranchSelectorProps {
  projectId: string | null;
  currentBranch: string;
  onBranchChange: (branch: string) => void;
}

export function BranchSelector({
  projectId,
  currentBranch,
  onBranchChange,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [error, setError] = useState("");

  const fetchBranches = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/branches`);
    const data = await res.json();
    if (data.branches) {
      setBranches(data.branches);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      fetchBranches();
      setSearch("");
      setCreating(false);
      setNewBranchName("");
      setError("");
    }
  }, [open, fetchBranches]);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleCreateBranch() {
    if (!projectId || !newBranchName.trim()) return;
    setError("");
    const res = await fetch(`/api/projects/${projectId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBranchName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create branch");
      return;
    }
    onBranchChange(newBranchName);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
          data-testid="branch-selector"
        >
          <GitBranch size={12} />
          <span className="max-w-[100px] truncate">{currentBranch}</span>
          <ChevronDown size={10} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-2xl w-64 z-50"
          data-testid="branch-popover"
        >
          {creating ? (
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium text-gray-300">
                Create new branch
              </p>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature/my-branch"
                className="w-full px-2 py-1.5 text-xs bg-[#0f0f0f] border border-white/[0.08] rounded text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                data-testid="new-branch-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateBranch();
                  }
                }}
                // biome-ignore lint/a11y/noAutofocus: popover input needs focus
                autoFocus
              />
              {error && <p className="text-[10px] text-red-400">{error}</p>}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="flex-1 px-2 py-1.5 text-xs text-gray-400 hover:text-white rounded hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim()}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-[var(--od-accent-strong)] rounded hover:bg-[var(--od-accent-deep,#3d4ea4)] disabled:opacity-50 transition-colors"
                  data-testid="create-branch-btn"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="p-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 px-2 py-1 bg-[#0f0f0f] rounded border border-white/[0.06]">
                  <Search size={12} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search branches..."
                    className="flex-1 text-xs bg-transparent text-white placeholder-gray-600 focus:outline-none"
                    data-testid="branch-search"
                    // biome-ignore lint/a11y/noAutofocus: popover input needs focus
                    autoFocus
                  />
                </div>
              </div>

              {/* Branch list */}
              <div className="max-h-48 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">
                    No branches found
                  </p>
                ) : (
                  filtered.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        onBranchChange(branch.name);
                        setOpen(false);
                      }}
                      className={clsx(
                        "flex items-center justify-between w-full px-3 py-1.5 text-xs transition-colors",
                        branch.name === currentBranch
                          ? "text-[var(--od-accent-strong)] bg-[var(--od-accent-soft)]"
                          : "text-gray-300 hover:bg-white/[0.06]",
                      )}
                      data-testid={`branch-item-${branch.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch size={12} className="shrink-0" />
                        <span className="truncate">{branch.name}</span>
                        {branch.isDefault && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.08] text-gray-400 font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      {branch.name === currentBranch && (
                        <Check
                          size={12}
                          className="text-[var(--od-accent-strong)]"
                        />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Create new */}
              <div className="border-t border-white/[0.08] p-1">
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
                  data-testid="create-branch-trigger"
                >
                  <Plus size={12} />
                  Create new branch
                </button>
              </div>
            </>
          )}
          <Popover.Arrow className="fill-[#1a1a1a]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
