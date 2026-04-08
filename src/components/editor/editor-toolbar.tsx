"use client";

import type { EditorMode, MdxSnippetKey } from "@/lib/editor";
import { mdxSnippets } from "@/lib/editor";
import * as Popover from "@radix-ui/react-popover";
import { clsx } from "clsx";
import {
  Bold,
  ChevronDown,
  Code2,
  ExternalLink,
  Eye,
  GitBranch,
  Heading2,
  Image,
  Italic,
  Link,
  Plus,
  Redo2,
  Search,
  Settings,
  Undo2,
} from "lucide-react";
import { useState } from "react";

interface EditorToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onBold?: () => void;
  onItalic?: () => void;
  onHeading?: () => void;
  onLink?: () => void;
  onImage?: () => void;
  onCodeBlock?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onInsertSnippet?: (key: MdxSnippetKey) => void;
  onToggleSettings?: () => void;
  onPublish?: () => void;
  siteUrl?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

export function EditorToolbar({
  mode,
  onModeChange,
  onBold,
  onItalic,
  onHeading,
  onLink,
  onImage,
  onCodeBlock,
  onUndo,
  onRedo,
  onInsertSnippet,
  onToggleSettings,
  onPublish,
  siteUrl,
  canUndo,
  canRedo,
  isSaving,
  hasUnsavedChanges,
}: EditorToolbarProps) {
  const [showAddNew, setShowAddNew] = useState(false);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.08] bg-[#0f0f0f] shrink-0">
      {/* Left: Mode toggle + undo/redo */}
      <div className="flex items-center gap-1">
        {/* Mode toggle tabs */}
        <div className="flex items-center bg-[#1a1a1a] rounded-md p-0.5 mr-2">
          <button
            type="button"
            data-testid="mode-visual"
            data-active={mode === "visual"}
            onClick={() => onModeChange("visual")}
            className={clsx(
              "px-2.5 py-1 text-xs font-medium rounded transition-colors",
              mode === "visual"
                ? "bg-[#2a2a2a] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            <span className="flex items-center gap-1.5">
              <Eye size={12} />
              Visual
            </span>
          </button>
          <button
            type="button"
            data-testid="mode-markdown"
            data-active={mode === "markdown"}
            onClick={() => onModeChange("markdown")}
            className={clsx(
              "px-2.5 py-1 text-xs font-medium rounded transition-colors",
              mode === "markdown"
                ? "bg-[#2a2a2a] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            <span className="flex items-center gap-1.5">
              <Code2 size={12} />
              Markdown
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Branch selector (static for now) */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
          data-testid="branch-selector"
        >
          <GitBranch size={12} />
          <span>main</span>
          <ChevronDown size={10} />
        </button>
      </div>

      {/* Center: Formatting toolbar (visible in both modes) */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          data-testid="toolbar-bold"
          onClick={onBold}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-italic"
          onClick={onItalic}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-heading"
          onClick={onHeading}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Heading"
        >
          <Heading2 size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-link"
          onClick={onLink}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Link"
        >
          <Link size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-image"
          onClick={onImage}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Image"
        >
          <Image size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-code"
          onClick={onCodeBlock}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Code block"
        >
          <Code2 size={14} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Add new dropdown */}
        <div className="relative">
          <button
            type="button"
            data-testid="add-new-dropdown-btn"
            onClick={() => setShowAddNew(!showAddNew)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
          >
            <Plus size={12} />
            <span>Add new</span>
            <ChevronDown size={10} />
          </button>

          {showAddNew && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-2xl z-50 py-1">
              <div className="px-3 py-1.5 text-[10px] font-medium text-gray-600 uppercase tracking-wider">
                Add
              </div>
              <DropdownItem
                label="Tab"
                onClick={() => {
                  onInsertSnippet?.("tab");
                  setShowAddNew(false);
                }}
              />
              <div className="px-3 py-1.5 text-[10px] font-medium text-gray-600 uppercase tracking-wider mt-1">
                Wrap with
              </div>
              <DropdownItem
                label="Dropdown"
                onClick={() => {
                  onInsertSnippet?.("dropdown");
                  setShowAddNew(false);
                }}
              />
              <DropdownItem
                label="Anchor"
                onClick={() => {
                  onInsertSnippet?.("anchor");
                  setShowAddNew(false);
                }}
              />
              <DropdownItem
                label="Card"
                onClick={() => {
                  onInsertSnippet?.("card");
                  setShowAddNew(false);
                }}
              />
              <DropdownItem
                label="Columns"
                onClick={() => {
                  onInsertSnippet?.("columns");
                  setShowAddNew(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: Search, Settings, Preview, Publish */}
      <div className="flex items-center gap-1">
        {/* Auto-save indicator */}
        {isSaving && (
          <span className="text-[10px] text-gray-500 mr-2">Saving...</span>
        )}
        {hasUnsavedChanges && !isSaving && (
          <span className="text-[10px] text-amber-500 mr-2">Unsaved</span>
        )}

        <button
          type="button"
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Search"
        >
          <Search size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleSettings}
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Page settings"
          data-testid="page-settings-btn"
        >
          <Settings size={14} />
        </button>

        <button
          type="button"
          className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Preview"
        >
          <ExternalLink size={14} />
        </button>

        {/* Publish button with popover */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              data-testid="publish-btn"
              className="ml-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 transition-colors"
            >
              Publish
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-2xl p-4 w-72 z-50"
              data-testid="publish-popover"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <ExternalLink size={14} className="text-gray-500" />
                  <span className="text-gray-500 truncate">
                    {siteUrl || "your-project.mintlify.app"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onPublish}
                  className="w-full px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 transition-colors"
                >
                  Publish
                </button>
              </div>
              <Popover.Arrow className="fill-[#1a1a1a]" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}

function DropdownItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
    >
      {label}
    </button>
  );
}
