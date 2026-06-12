"use client";

import { clsx } from "clsx";
import { GitBranch, Globe, Lock } from "lucide-react";

export interface ConnectedRepoOption {
  fullName: string;
  branch: string;
  permissions: string;
  installationId?: string;
}

interface ConnectedRepoSelectProps {
  repos: ConnectedRepoOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowPublicUrl?: boolean;
  publicUrlValue?: string;
  onPublicUrlChange?: (value: string) => void;
}

export function ConnectedRepoSelect({
  repos,
  value,
  onChange,
  disabled = false,
  allowPublicUrl = false,
  publicUrlValue = "",
  onPublicUrlChange,
}: ConnectedRepoSelectProps) {
  const hasRepos = repos.length > 0;

  return (
    <div className="space-y-3">
      <label
        htmlFor="connected-repo-select"
        className="block text-sm font-medium text-gray-300"
      >
        GitHub repository <span className="text-gray-500">(optional)</span>
      </label>

      {hasRepos ? (
        <div className="space-y-2">
          <div className="relative">
            <GitBranch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <select
              id="connected-repo-select"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] py-2.5 pl-10 pr-4 text-sm text-[var(--od-text)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)] disabled:opacity-50"
            >
              <option value="">No repository selected</option>
              {repos.map((repo) => (
                <option
                  key={`${repo.fullName}:${repo.branch}`}
                  value={repo.fullName}
                >
                  {repo.fullName} ({repo.branch})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {repos.map((repo) => {
              const isSelected =
                value.toLowerCase() === repo.fullName.toLowerCase();
              return (
                <div
                  key={`${repo.fullName}:${repo.branch}:details`}
                  className={clsx(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
                    isSelected
                      ? "border-[var(--od-accent)] bg-[var(--od-accent-soft)] text-[var(--od-accent-text)]"
                      : "border-[var(--od-border)] bg-[var(--od-panel-muted)] text-[var(--od-text-muted)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span className="font-medium text-white">
                      {repo.fullName}
                    </span>
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-gray-300">
                      {repo.branch}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {repo.permissions}
                    </span>
                    {isSelected && (
                      <span className="rounded bg-[var(--od-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--od-accent-text)]">
                        selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg border px-4 py-3 text-sm font-medium"
          data-testid="empty-connected-repos-notice"
          style={{
            background: "var(--od-warning-soft)",
            borderColor:
              "color-mix(in srgb, var(--od-warning) 35%, transparent)",
            color: "var(--od-text)",
          }}
        >
          No connected GitHub repositories yet. Connect GitHub first to import a
          private repository.
        </div>
      )}

      {allowPublicUrl && (
        <div className="space-y-2 pt-2">
          <label
            htmlFor="public-repo-url"
            className="flex items-center gap-2 text-sm font-medium text-gray-300"
          >
            <Globe className="h-4 w-4 text-gray-500" />
            Or paste a public GitHub repo URL
          </label>
          <input
            id="public-repo-url"
            type="text"
            value={publicUrlValue}
            onChange={(e) => onPublicUrlChange?.(e.target.value)}
            disabled={disabled}
            placeholder="https://github.com/org/repo"
            className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] px-4 py-2.5 text-sm text-[var(--od-text)] placeholder-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)] disabled:opacity-50"
          />
          <p className="text-xs text-gray-500">
            Use this only for public repositories. Private repos should be
            selected from a verified GitHub connection above.
          </p>
        </div>
      )}
    </div>
  );
}
