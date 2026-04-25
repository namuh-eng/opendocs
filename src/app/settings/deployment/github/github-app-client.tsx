"use client";

import { clsx } from "clsx";
import {
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Loader2,
  Shield,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface RepoInfo {
  fullName: string;
  branch: string;
  permissions: string;
}

interface ConnectionData {
  id: string;
  installationId: string;
  repos: RepoInfo[];
  autoUpdateEnabled: boolean;
  createdAt: string;
}

interface SelectedGitHubSource {
  repoFullName: string;
  owner: string;
  repo: string;
  installationId?: string;
  branch?: string;
  path?: string;
  sourceType: "connected_repo" | "public_repo";
}

interface GitHubAppSettingsClientProps {
  initialConnections: ConnectionData[];
  isAdmin: boolean;
  selectedRepoFullName?: string | null;
  selectedSource?: SelectedGitHubSource | null;
}

function GitHubIcon({
  size = 20,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function GitHubAppSettingsClient({
  initialConnections,
  isAdmin,
  selectedRepoFullName,
  selectedSource,
}: GitHubAppSettingsClientProps) {
  const [connections, setConnections] =
    useState<ConnectionData[]>(initialConnections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const hasConnections = connections.length > 0;
  const normalizedSelectedRepo = selectedRepoFullName?.toLowerCase() ?? null;

  const selectedRepoConnected = useMemo(
    () =>
      Boolean(
        normalizedSelectedRepo &&
          connections.some((connection) =>
            connection.repos.some(
              (repo) => repo.fullName.toLowerCase() === normalizedSelectedRepo,
            ),
          ),
      ),
    [connections, normalizedSelectedRepo],
  );

  const handleToggleAutoUpdate = useCallback(
    async (connection: ConnectionData) => {
      setToggling(connection.id);
      setError(null);
      try {
        const res = await fetch("/api/github-connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            installationId: connection.installationId,
            repos: connection.repos,
            autoUpdateEnabled: !connection.autoUpdateEnabled,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to update");
        }
        setConnections((prev) =>
          prev.map((c) =>
            c.id === connection.id
              ? { ...c, autoUpdateEnabled: !c.autoUpdateEnabled }
              : c,
          ),
        );
        setSuccess("Auto-updates updated successfully");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
      } finally {
        setToggling(null);
      }
    },
    [],
  );

  const handleRemove = useCallback(async (connectionId: string) => {
    if (!confirm("Are you sure you want to remove this GitHub connection?")) {
      return;
    }
    setRemoving(connectionId);
    setError(null);
    try {
      const res = await fetch(`/api/github-connections?id=${connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove");
      }
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      setSuccess("Connection removed");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemoving(null);
    }
  }, []);

  const handleInstall = useCallback(() => {
    // In a real implementation, this would redirect to GitHub App install URL
    // For now, simulate adding a connection
    setLoading(true);
    setError(null);
    setTimeout(async () => {
      try {
        const res = await fetch("/api/github-connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            installationId: `inst_${Date.now()}`,
            repos: [],
            autoUpdateEnabled: true,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to install");
        }
        const data = await res.json();
        setConnections((prev) => [
          ...prev,
          {
            id: data.connection.id,
            installationId: data.connection.installationId,
            repos: data.connection.repos ?? [],
            autoUpdateEnabled: data.connection.autoUpdateEnabled,
            createdAt: data.connection.createdAt,
          },
        ]);
        setSuccess("GitHub App installed successfully");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to install");
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  return (
    <div
      className="mx-auto max-w-2xl px-8 py-8"
      data-testid="github-app-settings"
    >
      <div className="mb-1 text-sm text-gray-500">Settings / GitHub app</div>

      <h1 className="mb-2 text-xl font-semibold text-white">
        Enable auto updates
      </h1>
      <p className="mb-8 text-sm text-gray-400">
        Your active GitHub app connections
      </p>

      {selectedRepoFullName && (
        <div
          data-testid="github-selected-repo-status"
          className={clsx(
            "mb-4 rounded-lg border px-4 py-3 text-sm",
            selectedRepoConnected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200",
          )}
        >
          <div className="flex items-start gap-2">
            <CheckCircle2
              size={16}
              className={clsx(
                "mt-0.5 shrink-0",
                selectedRepoConnected ? "text-emerald-300" : "text-amber-300",
              )}
            />
            <div className="w-full">
              <p className="font-medium text-white">Selected repository</p>
              <p>{selectedRepoFullName}</p>
              <p className="mt-1 text-xs text-gray-300">
                {selectedRepoConnected
                  ? "This repository is available through the current GitHub connection."
                  : "This repository is not available in the current GitHub connection yet. Connect GitHub and select the repo before import."}
              </p>

              {selectedSource && (
                <div className="mt-3 rounded-md border border-white/10 bg-black/10 px-3 py-2 text-xs text-gray-300">
                  <div>
                    <span className="text-gray-500">Source type:</span>{" "}
                    {selectedSource.sourceType === "connected_repo"
                      ? "Connected GitHub repo"
                      : "Public GitHub repo"}
                  </div>
                  <div>
                    <span className="text-gray-500">Branch:</span>{" "}
                    {selectedSource.branch ?? "main"}
                  </div>
                  <div>
                    <span className="text-gray-500">Path:</span>{" "}
                    {selectedSource.path ?? "/"}
                  </div>
                  {selectedSource.installationId && (
                    <div>
                      <span className="text-gray-500">Installation:</span>{" "}
                      {selectedSource.installationId}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Configure GitHub app section */}
      <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h2 className="mb-2 text-base font-medium text-white">
          Configure GitHub app
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          Install the GitHub App to enable automatic updates and private
          repository access.
        </p>

        {!hasConnections && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={loading || !isAdmin}
            data-testid="install-github-app-btn"
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              isAdmin
                ? "border-white/[0.15] bg-white/[0.06] text-white hover:bg-white/[0.1]"
                : "cursor-not-allowed border-white/[0.06] text-gray-500",
            )}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GitHubIcon size={16} />
            )}
            Install the GitHub app
            <ExternalLink size={14} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Active connections */}
      {hasConnections && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-white">
            Active connections
          </h2>

          {connections.map((conn) => (
            <div
              key={conn.id}
              data-testid={`github-connection-${conn.id}`}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                    <GitHubIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Installation {conn.installationId.slice(0, 12)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {conn.repos.length} repo
                      {conn.repos.length !== 1 ? "s" : ""} connected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Auto-update toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleAutoUpdate(conn)}
                    disabled={toggling === conn.id || !isAdmin}
                    data-testid={`toggle-auto-update-${conn.id}`}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      conn.autoUpdateEnabled
                        ? "bg-emerald-500"
                        : "bg-white/[0.15]",
                      !isAdmin && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        conn.autoUpdateEnabled
                          ? "translate-x-6"
                          : "translate-x-1",
                      )}
                    />
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemove(conn.id)}
                      disabled={removing === conn.id}
                      data-testid={`remove-connection-${conn.id}`}
                      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      {removing === conn.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Connected repos list */}
              {conn.repos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {conn.repos.map((repo) => (
                    <div
                      key={repo.fullName}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch size={14} className="text-gray-500" />
                        <span className="text-sm text-white">
                          {repo.fullName}
                        </span>
                        {normalizedSelectedRepo === repo.fullName.toLowerCase() && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                            selected for import
                          </span>
                        )}
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-gray-400">
                          {repo.branch}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Shield size={12} />
                        {repo.permissions}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Add another connection */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
            >
              <GitHubIcon size={14} />
              Install another GitHub App
            </button>
          )}
        </div>
      )}
    </div>
  );
}
