"use client";

import { BranchSelector } from "@/components/editor/branch-selector";
import type { EditorMode, MdxSnippetKey } from "@/lib/editor";
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

const iconButtonClasses =
  "p-1.5 rounded text-[var(--od-toolbar-icon)] hover:text-[var(--od-text)] hover:bg-[var(--od-panel-muted)] transition-colors";

const toggleClasses = (active: boolean | undefined) =>
  clsx(
    "p-1.5 rounded transition-colors",
    active
      ? "bg-[var(--od-accent-soft)] text-[var(--od-accent-text)]"
      : "text-[var(--od-toolbar-icon)] hover:text-[var(--od-text)] hover:bg-[var(--od-panel-muted)]",
  );

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
    <div className="editor-toolbar flex items-center justify-between gap-3 overflow-x-auto px-4 py-2 border-b border-[var(--od-toolbar-border)] bg-[var(--od-toolbar-bg)] backdrop-blur shrink-0">
      {/* Left: Mode toggle + undo/redo */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Mode toggle tabs */}
        <div className="flex items-center bg-[var(--od-toolbar-mode-bg)] rounded-lg p-0.5 mr-2 ring-1 ring-[var(--od-toolbar-mode-border)]">
          <button
            type="button"
            data-testid="mode-visual"
            data-active={mode === "visual"}
            onClick={() => onModeChange("visual")}
            className={clsx(
              "px-2.5 py-1 text-xs font-medium rounded transition-colors",
              mode === "visual"
                ? "bg-[var(--od-toolbar-mode-active-bg)] text-[var(--od-toolbar-mode-active-text)] shadow-sm"
                : "text-[var(--od-toolbar-icon)] hover:text-[var(--od-text)]",
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
                ? "bg-[var(--od-toolbar-mode-active-bg)] text-[var(--od-toolbar-mode-active-text)] shadow-sm"
                : "text-[var(--od-toolbar-icon)] hover:text-[var(--od-text)]",
            )}
          >
            <span className="flex items-center gap-1.5">
              <Code2 size={12} />
              Markdown
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--od-toolbar-separator)] mx-1" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded text-[var(--od-toolbar-icon)] hover:text-[var(--od-text)] hover:bg-[var(--od-panel-muted)] disabled:text-[var(--od-toolbar-icon-disabled)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded text-[var(--od-toolbar-icon)] hover:text-[var(--od-text)] hover:bg-[var(--od-panel-muted)] disabled:text-[var(--od-toolbar-icon-disabled)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--od-toolbar-separator)] mx-1" />

        {/* Branch selector */}
        <BranchSelector
          projectId={projectId ?? null}
          currentBranch={currentBranch}
          onBranchChange={onBranchChange ?? (() => {})}
        />
      </div>

      {/* Center: Formatting toolbar (visible in both modes) */}
      <div className="order-3 flex shrink-0 items-center gap-0.5 rounded-lg border border-[var(--od-toolbar-format-border)] bg-[var(--od-toolbar-format-bg)] px-1 py-0.5">
        <button
          type="button"
          data-testid="toolbar-bold"
          onClick={onBold}
          className={iconButtonClasses}
          aria-label="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-italic"
          onClick={onItalic}
          className={iconButtonClasses}
          aria-label="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-heading"
          onClick={onHeading}
          className={iconButtonClasses}
          aria-label="Heading"
        >
          <Heading2 size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-link"
          onClick={onLink}
          className={iconButtonClasses}
          aria-label="Link"
        >
          <Link size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-image"
          onClick={onImage}
          className={iconButtonClasses}
          aria-label="Image"
        >
          <Image size={14} />
        </button>
        <button
          type="button"
          data-testid="toolbar-code"
          onClick={onCodeBlock}
          className={iconButtonClasses}
          aria-label="Code block"
        >
          <Code2 size={14} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--od-toolbar-separator)] mx-1" />

        {/* Add new dropdown */}
        <div className="relative">
          <button
            type="button"
            data-testid="add-new-dropdown-btn"
            onClick={() => setShowAddNew(!showAddNew)}
            className="flex items-center gap-1 whitespace-nowrap px-2 py-1 text-xs text-[var(--od-toolbar-icon)] hover:text-[var(--od-text)] hover:bg-[var(--od-panel-muted)] rounded transition-colors"
          >
            <Plus size={12} />
            <span>Add new</span>
            <ChevronDown size={10} />
          </button>

          {showAddNew && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--od-panel)] border border-[var(--od-border)] rounded-lg shadow-2xl z-50 py-1">
              <div className="px-3 py-1.5 text-[10px] font-medium text-[var(--od-text-subtle)] uppercase tracking-wider">
                Add
              </div>
              <DropdownItem
                label="Tab"
                onClick={() => {
                  onInsertSnippet?.("tab");
                  setShowAddNew(false);
                }}
              />
              <div className="px-3 py-1.5 text-[10px] font-medium text-[var(--od-text-subtle)] uppercase tracking-wider mt-1">
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
          <span className="text-[10px] text-[var(--od-text-subtle)] mr-2">
            Saving...
          </span>
        )}
        {hasUnsavedChanges && !isSaving && (
          <span className="text-[10px] text-[var(--od-warning)] mr-2">
            Unsaved
          </span>
        )}

        <button type="button" className={iconButtonClasses} aria-label="Search">
          <Search size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleComments}
          className={toggleClasses(showComments)}
          aria-label="Comments"
          data-testid="comments-btn"
        >
          <MessageSquare size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleSuggestions}
          className={clsx("hidden xl:flex", toggleClasses(showSuggestions))}
          aria-label="Suggestions"
          data-testid="suggestions-btn"
        >
          <FileText size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleAnalytics}
          className={clsx("hidden xl:flex", toggleClasses(showAnalytics))}
          aria-label="Page analytics"
          data-testid="analytics-btn"
        >
          <BarChart3 size={14} />
        </button>

        <button
          type="button"
          onClick={onToggleSettings}
          className={toggleClasses(showSettings)}
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
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--od-preview-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--od-preview-color)] transition-colors hover:border-[var(--od-accent-border)] hover:bg-[var(--od-panel-muted)] hover:text-[var(--od-text)] disabled:cursor-not-allowed disabled:opacity-40"
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
              className="ml-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold transition-[filter,background-color] hover:brightness-110"
              style={{
                backgroundColor: "var(--od-publish-bg)",
                color: "var(--od-publish-color)",
                boxShadow: "var(--od-publish-shadow)",
              }}
            >
              Publish
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              className="bg-[var(--od-panel)] border border-[var(--od-border)] rounded-lg shadow-2xl p-4 w-72 z-50"
              data-testid="publish-popover"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[var(--od-text-muted)]">
                  <ExternalLink
                    size={14}
                    className="text-[var(--od-text-subtle)]"
                  />
                  <span className="text-[var(--od-text-muted)] truncate">
                    {siteUrl || previewUrl || "your-project.mintlify.app"}
                  </span>
                </div>
                <p className="text-xs leading-5 text-[var(--od-text-subtle)]">
                  Save the current page, publish the docs site, and open the
                  deployment on the dashboard.
                </p>
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={isSaving}
                  className={clsx(
                    "w-full px-3 py-2 text-sm font-semibold rounded-md transition-[filter,background-color]",
                    isSaving
                      ? "text-[var(--od-text-muted)] bg-[var(--od-panel-muted)] cursor-wait"
                      : "hover:brightness-110",
                  )}
                  style={
                    isSaving
                      ? undefined
                      : {
                          backgroundColor: "var(--od-publish-bg)",
                          color: "var(--od-publish-color)",
                        }
                  }
                >
                  {isSaving ? "Publishing..." : "Publish"}
                </button>
              </div>
              <Popover.Arrow className="fill-[var(--od-panel)]" />
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
      className="flex items-center w-full px-3 py-1.5 text-sm text-[var(--od-text-muted)] hover:bg-[var(--od-panel-muted)] hover:text-[var(--od-text)] transition-colors"
    >
      {label}
    </button>
  );
}
