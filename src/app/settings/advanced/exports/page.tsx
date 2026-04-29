"use client";

import { useActiveProject } from "@/hooks/use-active-project";
import {
  type ExportableProject,
  buildProjectExport,
  buildProjectExportFilename,
  downloadJson,
} from "@/lib/project-export";
import { Download, FileJson } from "lucide-react";

export default function ExportsSettingsPage() {
  const { project, loading } = useActiveProject<ExportableProject>();

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

  const handleDownload = () => {
    downloadJson(
      buildProjectExportFilename(project),
      buildProjectExport(project),
    );
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">
        Settings / Advanced / Exports
      </div>
      <h1 className="mb-2 text-xl font-semibold text-white">Exports</h1>
      <p className="mb-6 text-sm text-gray-400">
        Download a portable JSON snapshot of this project&apos;s deployment and
        configuration metadata.
      </p>

      <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            <FileJson size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-white">Project JSON</h2>
            <p className="mt-1 text-sm text-gray-400">
              Includes project identity, domains, repository source, and saved
              settings. Page content exports can be added separately once the
              docs export format is finalized.
            </p>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Project</dt>
                <dd className="truncate text-gray-200">{project.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Repository</dt>
                <dd className="truncate text-gray-200">
                  {project.repoUrl ?? "Not connected"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Download size={16} />
          Download JSON
        </button>
      </div>
    </div>
  );
}
