"use client";

import { clsx } from "clsx";
import {
  AlertTriangle,
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
  installUrl?: string | null;
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
  installUrl,
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
    setError(null);
    if (!installUrl) return;

    setLoading(true);
    window.location.assign(installUrl);
  }, [installUrl]);

  const installActionLabel = !installUrl
    ? "GitHub app setup required"
    : hasConnections || (normalizedSelectedRepo && !selectedRepoConnected)
      ? "Update GitHub app access"
      : "Install GitHub app";

  const callbackNotice = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("github_app");
    if (status === "connected") {
      return {
        tone: "success" as const,
        message:
          "GitHub is connected. OpenDocs can now sync the repositories selected in the app installation.",
      };
    }
    if (status === "error") {
      const errorCode = params.get("error") ?? "unknown_error";
      const copy: Record<string, string> = {
        forbidden:
          "Only organization admins and editors can connect the GitHub app.",
        installation_already_connected:
          "That GitHub installation is already connected to another OpenDocs organization.",
        installation_auth_failed:
          "OpenDocs could not verify that GitHub installation. Check the app credentials and selected repositories, then try again.",
        invalid_callback:
          "GitHub returned an incomplete install callback. Start the install from this page instead of GitHub Marketplace.",
        no_org: "Your account is not attached to an OpenDocs organization yet.",
        org_required:
          "Choose an OpenDocs organization before connecting GitHub.",
        unauthorized:
          "Sign in to OpenDocs, then start the GitHub app installation again.",
      };
      return {
        tone: "error" as const,
        message:
          copy[errorCode] ??
          "OpenDocs could not complete the GitHub app installation. Start the install from this page and try again.",
      };
    }
    return null;
  }, []);

  const renderInstallAction = (testId: string) => {
    const isActionable = Boolean(installUrl && isAdmin);

    return (
      <button
        type="button"
        onClick={handleInstall}
        disabled={loading || !isActionable}
        data-testid={testId}
        aria-disabled={!isActionable}
        title={
          installUrl
            ? undefined
            : "Set GITHUB_APP_SLUG or GITHUB_APP_INSTALL_URL in the production environment first."
        }
        className={clsx(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
          isActionable
            ? "bg-gray-950 text-white hover:bg-gray-800"
            : installUrl
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "cursor-not-allowed bg-amber-100 text-amber-950 opacity-80",
        )}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <GitHubIcon size={16} />
        )}
        {installActionLabel}
        {installUrl && <ExternalLink size={14} className="opacity-70" />}
      </button>
    );
  };

  return (
    <div
      className="mx-auto max-w-3xl px-8 py-8 text-gray-950"
      data-testid="github-app-settings"
    >
      <div className="mb-2 text-sm font-medium text-gray-500">
        Settings / GitHub app
      </div>

      <h1 className="mb-2 text-2xl font-semibold tracking-[-0.02em] text-gray-950">
        Connect GitHub to enable auto updates
      </h1>
      <p className="mb-8 max-w-2xl text-sm leading-6 text-gray-600">
        Install the OpenDocs GitHub App and grant access to the repository that
        powers this project. Once connected, OpenDocs can pull changes from the
        selected branch and keep your docs in sync.
      </p>

      {!installUrl && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-700"
            />
            <div>
              <p className="font-semibold text-gray-950">
                GitHub App setup is incomplete
              </p>
              <p className="mt-1 leading-6 text-amber-900">
                OpenDocs needs a configured GitHub App slug or install URL
                before users can connect repositories. The install action will
                not send users to GitHub Marketplace; it stays here and shows
                this setup error until the production app is configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {callbackNotice && (
        <div
          className={clsx(
            "mb-5 rounded-2xl border p-5 text-sm shadow-sm",
            callbackNotice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {callbackNotice.message}
        </div>
      )}

      {selectedRepoFullName && (
        <div
          data-testid="github-selected-repo-status"
          className={clsx(
            "mb-5 rounded-2xl border p-5 text-sm shadow-sm",
            selectedRepoConnected
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950",
          )}
        >
          <div className="flex items-start gap-3">
            {selectedRepoConnected ? (
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-700"
              />
            ) : (
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-700"
              />
            )}
            <div className="w-full space-y-4">
              <div>
                <p className="font-semibold text-gray-950">
                  {selectedRepoConnected
                    ? "Repository connected"
                    : "Repository access required"}
                </p>
                <p className="mt-1 font-mono text-xs font-medium text-gray-800">
                  {selectedRepoFullName}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {selectedRepoConnected
                    ? "This repository is included in the current GitHub app installation. Auto updates can run when changes land on the selected branch."
                    : installUrl
                      ? "Auto updates are disabled because this repository is not included in the current GitHub app installation. Update the app installation, grant access to this repository, then select it for this project."
                      : "Auto updates are disabled because the production GitHub App install URL is not configured yet. Configure the app first, then grant repository access."}
                </p>
              </div>

              {selectedSource && (
                <dl className="grid gap-2 rounded-xl border border-black/5 bg-white/70 p-3 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="font-medium text-gray-500">Source type</dt>
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {selectedSource.sourceType === "connected_repo"
                        ? "Connected GitHub repo"
                        : "Public GitHub repo"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Branch</dt>
                    <dd className="mt-0.5 font-mono font-medium text-gray-900">
                      {selectedSource.branch ?? "main"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Path</dt>
                    <dd className="mt-0.5 font-mono font-medium text-gray-900">
                      {selectedSource.path ?? "/"}
                    </dd>
                  </div>
                  {selectedSource.installationId && (
                    <div className="sm:col-span-3">
                      <dt className="font-medium text-gray-500">
                        Installation
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium text-gray-900">
                        {selectedSource.installationId}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {!selectedRepoConnected && isAdmin && (
                <div>{renderInstallAction("update-github-app-access-btn")}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Configure GitHub app section */}
      <div className="mb-8 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="mb-2 text-base font-semibold text-gray-950">
              Configure the GitHub app
            </h2>
            <p className="max-w-xl text-sm leading-6 text-gray-600">
              Use this page to connect the repo OpenDocs should watch for
              documentation updates. This is the same production pattern used by
              hosted docs platforms: install the GitHub App, authorize the right
              organization or repository, then keep imports up to date from the
              selected branch and path.
            </p>
          </div>
          {!hasConnections && renderInstallAction("install-github-app-btn")}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [
              "1",
              "Install",
              "Open GitHub and install the OpenDocs app on the organization that owns your docs repository.",
            ],
            [
              "2",
              "Grant access",
              "Choose all repositories or only the specific repository you want OpenDocs to sync.",
            ],
            [
              "3",
              "Sync updates",
              "Select the branch and docs path so published docs stay current when repository changes land.",
            ],
          ].map(([step, title, description]) => (
            <div
              key={step}
              className="rounded-xl border border-black/[0.05] bg-gray-50 p-4"
            >
              <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                {step}
              </div>
              <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active connections */}
      {hasConnections && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              Active GitHub app connections
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              These installations can provide repository access and automatic
              updates for this project.
            </p>
          </div>

          {connections.map((conn) => (
            <div
              key={conn.id}
              data-testid={`github-connection-${conn.id}`}
              className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <GitHubIcon size={20} className="text-gray-950" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-950">
                      Installation {conn.installationId.slice(0, 12)}
                    </p>
                    <p className="text-xs text-gray-600">
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
                    aria-label={
                      conn.autoUpdateEnabled
                        ? "Disable auto updates"
                        : "Enable auto updates"
                    }
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
                      conn.autoUpdateEnabled ? "bg-emerald-500" : "bg-gray-300",
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
                      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      aria-label="Remove GitHub connection"
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
                      className="flex flex-col gap-2 rounded-xl border border-black/[0.05] bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <GitBranch size={14} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-950">
                          {repo.fullName}
                        </span>
                        {normalizedSelectedRepo ===
                          repo.fullName.toLowerCase() && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                            selected project repo
                          </span>
                        )}
                        <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs font-medium text-gray-700 ring-1 ring-black/[0.05]">
                          {repo.branch}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
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
          {isAdmin && renderInstallAction("add-github-app-access-btn")}
        </div>
      )}
    </div>
  );
}
