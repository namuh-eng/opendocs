"use client";

import { useEffect, useState } from "react";
import { useActiveProject } from "@/hooks/use-active-project";
import { useProjectUpdater } from "@/hooks/use-project-updater";

interface ProjectData {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  repoUrl: string | null;
  customDomain: string | null;
}

export default function SettingsGeneralPage() {
  const { project, setProject, loading } = useActiveProject<ProjectData>();
  const { saving, updateProject } = useProjectUpdater<ProjectData>({
    projectId: project?.id,
    setProject,
  });
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    setName(project.name);
    setSubdomain(project.subdomain ?? project.slug);
  }, [project]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setMessage(null);

    const result = await updateProject({
      name: name.trim(),
      subdomain: subdomain.trim(),
    });

    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setMessage({ type: "success", text: "Changes saved" });
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

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">Settings / General</div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-1.5">
          <label
            htmlFor="project-name"
            className="block text-sm font-medium text-white"
          >
            Project name
          </label>
          <p className="text-xs text-gray-500">Name displayed on the topbar</p>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="deployment-name"
            className="block text-sm font-medium text-white"
          >
            Deployment name
          </label>
          <input
            id="deployment-name"
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
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
    </div>
  );
}
