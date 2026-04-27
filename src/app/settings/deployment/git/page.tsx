"use client";

import { useActiveProject } from "@/hooks/use-active-project";
import { useProjectUpdater } from "@/hooks/use-project-updater";
import { buildZipDownloadUrl, getRepoDisplayName } from "@/lib/git-settings";
import type { VcsProvider } from "@/lib/git-settings";
import { useEffect, useState } from "react";

interface GitHubSourceDisplay {
  repoFullName: string;
  owner: string;
  repo: string;
  installationId?: string;
  branch?: string;
  path?: string;
  sourceType: "connected_repo" | "public_repo";
}

interface ProjectData {
  id: string;
  slug: string;
  repoUrl: string | null;
  repoBranch: string | null;
  repoPath: string | null;
  settings: Record<string, unknown> | null;
  githubSource: GitHubSourceDisplay | null;
}

export default function GitSettingsPage() {
  const { project, setProject, loading } = useActiveProject<ProjectData>();
  const { saving, updateProject } = useProjectUpdater<ProjectData>({
    projectId: project?.id,
    setProject,
  });
  const [branch, setBranch] = useState("main");
  const [repoPath, setRepoPath] = useState("/");
  const [vcsProvider, setVcsProvider] = useState<VcsProvider>("github");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    setBranch(project.repoBranch ?? "main");
    setRepoPath(project.repoPath ?? "/");
    const provider = project.settings?.vcsProvider;
    if (provider === "gitlab") {
      setVcsProvider("gitlab");
      return;
    }
    setVcsProvider("github");
  }, [project]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setMessage(null);

    const result = await updateProject({
      repoBranch: branch.trim(),
      repoPath: repoPath.trim(),
      settings: { ...project.settings, vcsProvider },
    });

    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setMessage({ type: "success", text: "Git settings saved" });
  };

  const githubSource = project?.githubSource ?? null;

  const handleClone = (visibility: "public" | "private") => {
    if (!project?.repoUrl) return;

    const url = `https://github.com/new/import?url=${encodeURIComponent(project.repoUrl)}&visibility=${visibility}`;
    window.open(url, "_blank", "noopener");
  };

  const handleDownloadZip = () => {
    if (!githubSource) return;

    const url = buildZipDownloadUrl(
      githubSource.owner,
      githubSource.repo,
      branch,
    );
    window.open(url, "_blank", "noopener");
  };

  const handleInstallGitHubApp = () => {
    window.open("https://github.com/apps", "_blank", "noopener");
  };

  const handleSwitchToGitLab = async () => {
    if (!project) return;
    setMessage(null);

    const result = await updateProject({
      settings: { ...project.settings, vcsProvider: "gitlab" },
    });

    if (!result.ok) {
      setMessage({ type: "error", text: "Failed to switch VCS provider" });
      return;
    }

    setVcsProvider("gitlab");
    setMessage({ type: "success", text: "Switched to GitLab" });
  };

  const handleSwitchToGitHub = async () => {
    if (!project) return;
    setMessage(null);

    const result = await updateProject({
      settings: { ...project.settings, vcsProvider: "github" },
    });

    if (!result.ok) {
      setMessage({ type: "error", text: "Failed to switch VCS provider" });
      return;
    }

    setVcsProvider("github");
    setMessage({ type: "success", text: "Switched to GitHub" });
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

  const repoDisplay =
    githubSource?.repoFullName ?? getRepoDisplayName(project.repoUrl);

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">
        Settings / Deployment / Git Settings
      </div>

      <h1 className="text-xl font-semibold text-white mb-6">Git Settings</h1>

      {/* Repo info */}
      <div className="mb-6 space-y-3">
        <div>
          <h2 className="text-sm font-medium text-white mb-1">Repository</h2>
          <p className="text-sm text-gray-400">
            {repoDisplay}
            {githubSource && (
              <span className="ml-2 text-xs text-gray-500">
                (branch: {branch}, path: {repoPath})
              </span>
            )}
          </p>
        </div>

        {githubSource && (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Resolved GitHub source
            </h3>
            <div className="mt-2 space-y-1 text-sm text-gray-300">
              <p>
                <span className="text-gray-500">Repository:</span>{" "}
                {githubSource.repoFullName}
              </p>
              <p>
                <span className="text-gray-500">Source type:</span>{" "}
                {githubSource.sourceType === "connected_repo"
                  ? "Connected GitHub repo"
                  : "Public GitHub repo"}
              </p>
              <p>
                <span className="text-gray-500">Branch:</span>{" "}
                {githubSource.branch ?? branch}
              </p>
              <p>
                <span className="text-gray-500">Path:</span>{" "}
                {githubSource.path ?? repoPath}
              </p>
              {githubSource.installationId && (
                <p>
                  <span className="text-gray-500">Installation:</span>{" "}
                  {githubSource.installationId}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Branch + path form */}
      <form onSubmit={handleSaveSettings} className="space-y-4 mb-8">
        <div className="space-y-1.5">
          <label
            htmlFor="repo-branch"
            className="block text-sm font-medium text-white"
          >
            Branch
          </label>
          <input
            id="repo-branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="repo-path"
            className="block text-sm font-medium text-white"
          >
            Directory path
          </label>
          <p className="text-xs text-gray-500">
            The directory inside the repository where your docs live
          </p>
          <input
            id="repo-path"
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="/"
            className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* GitHub section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-medium text-white">GitHub</h2>
          <span className="text-xs text-gray-500">
            Clone or connect your repository
          </span>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Your docs are currently hosted in a managed repository. Clone them to
          your own GitHub account or install the GitHub App to use your own
          repo.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleClone("public")}
            className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
          >
            Clone as public
          </button>
          <button
            type="button"
            onClick={() => handleClone("private")}
            className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
          >
            Clone as private
          </button>
          <button
            type="button"
            onClick={handleDownloadZip}
            className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
          >
            Download as ZIP
          </button>
          <button
            type="button"
            onClick={handleInstallGitHubApp}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Install GitHub App
          </button>
        </div>
      </div>

      {/* GitLab section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-medium text-white">GitLab</h2>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Connect your documentation to a GitLab repository instead of GitHub.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="https://docs.mintlify.com/integrations/gitlab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
          >
            Configure GitLab
          </a>
          {vcsProvider === "github" ? (
            <button
              type="button"
              onClick={handleSwitchToGitLab}
              disabled={saving}
              className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              Switch to GitLab
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSwitchToGitHub}
              disabled={saving}
              className="rounded-lg border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
            >
              Switch to GitHub
            </button>
          )}
        </div>

        {vcsProvider === "gitlab" && (
          <p className="mt-3 text-sm text-emerald-400">
            Currently using GitLab as your VCS provider
          </p>
        )}
      </div>
    </div>
  );
}
