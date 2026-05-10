"use client";

import { BranchSelector } from "@/components/editor/branch-selector";
import type { EditorMode, MdxSnippetKey } from "@/lib/editor";
import { mdxSnippets } from "@/lib/editor";
import * as Popover from "@radix-ui/react-popover";
import { clsx } from "clsx";
import {
  BarChart3,
  Bold,
  ChevronDown,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  Heading2,
  Image,
  Italic,
  Link,
  MessageSquare,
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
  onSave?: () => void;
  onCodeBlock?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onInsertSnippet?: (key: MdxSnippetKey) => void;
  onToggleSettings?: () => void;
  onToggleComments?: () => void;
  onToggleSuggestions?: () => void;
  onToggleAnalytics?: () => void;
  onPublish?: () => void;
  siteUrl?: string;
  previewUrl?: string;
  projectId?: string | null;
  currentBranch?: string;
  onBranchChange?: (branch: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  showSettings?: boolean;
  showComments?: boolean;
  showSuggestions?: boolean;
  showAnalytics?: boolean;
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
  showSettings,
  showComments,
  showSuggestions,
  showAnalytics,
  onToggleSettings,
  onToggleComments,
  onToggleSuggestions,
  onToggleAnalytics,
  onPublish,
  siteUrl,
  previewUrl,
  projectId,
  currentBranch = "main",
  onBranchChange,
  canUndo,
  canRedo,
  isSaving,
  hasUnsavedChanges,
}: EditorToolbarProps) {
  const [showAddNew, setShowAddNew] = useState(false);

  return (
    <div className="editor-toolbar flex items-center justify-between gap-3 overflow-x-auto px-4 py-2 border-b border-white/[0.08] bg-[#101010]/95 backdrop-blur shrink-0">
      {/* Left: Mode toggle + undo/redo */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Mode toggle tabs */}
        <div className="flex items-center bg-[#1a1a1a] rounded-lg p-0.5 mr-2 ring-1 ring-white/[0.06]">
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

        {/* Branch selector */}
        <BranchSelector
          projectId={projectId ?? null}
          currentBranch={currentBranch}
          onBranchChange={onBranchChange ?? (() => {})}
        />
      </div>

      {/* Center: Formatting toolbar (visible in both modes) */}
      <div className="order-3 flex shrink-0 items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-1 py-0.5">
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
            className="flex items-center gap-1 whitespace-nowrap px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
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
              <DropdownItem
                label="Language"
                onClick={() => {
                  onInsertSnippet?.("language");
                  setShowAddNew(false);
                }}
              />
              <DropdownItem
                label="Product"
                onClick={() => {
                  onInsertSnippet?.("product");
                  setShowAddNew(false);
                }}
              />
              <DropdownItem
                label="Version"
                onClick={() => {
                  onInsertSnippet?.("version");
                  setShowAddNew(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: Search, Settings, Preview, Publish */}
      <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5">
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
          onClick={onToggleComments}
          className={clsx(
            "p-1.5 rounded transition-colors",
            showComments
              ? "bg-emerald-600/20 text-emerald-400"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]",
          )}
          aria-label="Comments"
          data-testid="comments-btn"
        >
          <MessageSquare size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleSuggestions}
          className={clsx(
            "hidden xl:flex p-1.5 rounded transition-colors",
            showSuggestions
              ? "bg-emerald-600/20 text-emerald-400"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]",
          )}
          aria-label="Suggestions"
          data-testid="suggestions-btn"
        >
          <FileText size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleAnalytics}
          className={clsx(
            "hidden xl:flex p-1.5 rounded transition-colors",
            showAnalytics
              ? "bg-emerald-600/20 text-emerald-400"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]",
          )}
          aria-label="Page analytics"
          data-testid="analytics-btn"
        >
          <BarChart3 size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleSettings}
          className={clsx(
            "p-1.5 rounded transition-colors",
            showSettings
              ? "bg-emerald-600/20 text-emerald-400"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]",
          )}
          aria-label="Page settings"
          data-testid="page-settings-btn"
        >
          <Settings size={14} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (previewUrl) {
              window.open(previewUrl, "_blank", "noopener,noreferrer");
            }
          }}
          disabled={!previewUrl}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Preview"
        >
          <ExternalLink size={13} />
          <span className="hidden 2xl:inline">Preview</span>
        </button>

        {/* Publish button with popover */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              data-testid="publish-btn"
              className="ml-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-black shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
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
                  <span className="text-gray-400 truncate">
                    {siteUrl || previewUrl || "your-project.mintlify.app"}
                  </span>
                </div>
                <p className="text-xs leading-5 text-gray-500">
                  Save the current page, publish the docs site, and open the
                  deployment on the dashboard.
                </p>
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={isSaving}
                  className={clsx(
                    "w-full px-3 py-2 text-sm font-semibold rounded-md transition-colors",
                    isSaving
                      ? "text-gray-400 bg-gray-800 cursor-wait"
                      : "text-black bg-emerald-500 hover:bg-emerald-400",
                  )}
                >
                  {isSaving ? "Publishing..." : "Publish"}
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
