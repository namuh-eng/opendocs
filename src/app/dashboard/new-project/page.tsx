"use client";

import { ConnectedRepoSelect, type ConnectedRepoOption } from "@/components/github/connected-repo-select";
import { setStoredActiveProjectId } from "@/components/layout/shell-preferences";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedRepoFullName, setSelectedRepoFullName] = useState("");
  const [publicRepoUrl, setPublicRepoUrl] = useState("");
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepoOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(true);

  useEffect(() => {
    fetch("/api/github-connections")
      .then((res) => res.json())
      .then((data) => {
        const repos = (data.connections ?? []).flatMap(
          (connection: { installationId: string; repos?: ConnectedRepoOption[] }) =>
            (connection.repos ?? []).map((repo) => ({
              ...repo,
              installationId: connection.installationId,
            })),
        );
        setConnectedRepos(repos);
        setLoadingRepos(false);
      })
      .catch(() => setLoadingRepos(false));
  }, []);

  const selectedRepo = useMemo(
    () =>
      connectedRepos.find(
        (repo) => repo.fullName.toLowerCase() === selectedRepoFullName.toLowerCase(),
      ) ?? null,
    [connectedRepos, selectedRepoFullName],
  );

  const repoUrl = useMemo(() => {
    if (selectedRepoFullName) {
      return `https://github.com/${selectedRepoFullName}`;
    }
    return publicRepoUrl.trim();
  }, [publicRepoUrl, selectedRepoFullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Project name is required");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, string> = { name: trimmed };
      if (repoUrl.trim()) {
        body.repoUrl = repoUrl.trim();
      }
      if (selectedRepo?.installationId) {
        body.githubInstallationId = selectedRepo.installationId;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create project");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setStoredActiveProjectId(data.project.id);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-6">
        Create new documentation
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="project-name"
            className="block text-sm font-medium text-gray-300"
          >
            Project name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Docs"
            className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <ConnectedRepoSelect
            repos={connectedRepos}
            value={selectedRepoFullName}
            onChange={(value) => {
              setSelectedRepoFullName(value);
              if (value) {
                setPublicRepoUrl("");
              }
            }}
            disabled={loading || loadingRepos}
            allowPublicUrl
            publicUrlValue={publicRepoUrl}
            onPublicUrlChange={(value) => {
              setPublicRepoUrl(value);
              if (value.trim()) {
                setSelectedRepoFullName("");
              }
            }}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
