"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  type ConnectedRepoOption,
  ConnectedRepoSelect,
} from "@/components/github/connected-repo-select";
import { setStoredActiveProjectId } from "@/components/layout/shell-preferences";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedRepoFullName, setSelectedRepoFullName] = useState("");
  const [publicRepoUrl, setPublicRepoUrl] = useState("");
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepoOption[]>(
    [],
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(true);

  useEffect(() => {
    fetch("/api/github-connections")
      .then((res) => res.json())
      .then((data) => {
        const repos = (data.connections ?? []).flatMap(
          (connection: {
            installationId: string;
            repos?: ConnectedRepoOption[];
          }) =>
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
        (repo) =>
          repo.fullName.toLowerCase() === selectedRepoFullName.toLowerCase(),
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
      const body: Record<string, string | boolean> = { name: trimmed };
      if (repoUrl.trim()) {
        body.repoUrl = repoUrl.trim();
        body.createInitialDeployment = true;
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
      if (repoUrl.trim()) {
        const provisionRes = await fetch("/api/onboarding/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: data.project.id }),
        });

        if (!provisionRes.ok) {
          const provisionData = await provisionRes.json().catch(() => null);
          setError(
            provisionData?.error || "Failed to provision initial content",
          );
          setLoading(false);
          return;
        }
      }

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
            className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] px-4 py-2.5 text-sm text-[var(--od-text)] placeholder-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
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
            className="rounded-lg border border-[var(--od-border)] px-4 py-2 text-sm text-[var(--od-text-muted)] transition-colors hover:bg-[var(--od-panel-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--od-accent-strong)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--od-accent-deep,#3d4ea4)] disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
