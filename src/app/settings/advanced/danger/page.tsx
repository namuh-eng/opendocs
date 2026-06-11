"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useActiveProject } from "@/hooks/use-active-project";

interface ProjectData {
  id: string;
  name: string;
  slug: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const MIN_REASON_LENGTH = 3;

export default function DangerZonePage() {
  const router = useRouter();
  const { project, loading } = useActiveProject<ProjectData>();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  // Deployment deletion state
  const [deployReason, setDeployReason] = useState("");
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [deployConfirmText, setDeployConfirmText] = useState("");
  const [deletingDeploy, setDeletingDeploy] = useState(false);
  const [deployError, setDeployError] = useState("");

  // Org deletion state
  const [orgReason, setOrgReason] = useState("");
  const [showOrgConfirm, setShowOrgConfirm] = useState(false);
  const [orgConfirmText, setOrgConfirmText] = useState("");
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [orgError, setOrgError] = useState("");

  useEffect(() => {
    fetch("/api/orgs")
      .then((r) => r.json())
      .then((orgsData) => {
        if (orgsData.orgs?.length > 0) {
          setOrg(orgsData.orgs[0]);
        }
        setOrgLoading(false);
      })
      .catch(() => setOrgLoading(false));
  }, []);

  const handleDeleteDeployment = useCallback(async () => {
    if (!project || deployConfirmText !== project.name) return;
    setDeletingDeploy(true);
    setDeployError("");

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deployReason.trim(),
          confirmName: deployConfirmText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDeployError(data.error || "Failed to delete deployment");
        setDeletingDeploy(false);
        return;
      }

      // Redirect to dashboard after project deletion
      router.push("/dashboard");
    } catch {
      setDeployError("Something went wrong");
      setDeletingDeploy(false);
    }
  }, [project, deployConfirmText, deployReason, router]);

  const handleDeleteOrg = useCallback(async () => {
    if (!org || orgConfirmText !== org.name) return;
    setDeletingOrg(true);
    setOrgError("");

    try {
      const res = await fetch(`/api/orgs/${org.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: orgReason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setOrgError(data.error || "Failed to delete organization");
        setDeletingOrg(false);
        return;
      }

      // Redirect to login after org deletion (no org = no access)
      router.push("/login");
    } catch {
      setOrgError("Something went wrong");
      setDeletingOrg(false);
    }
  }, [org, orgConfirmText, orgReason, router]);

  if (loading || orgLoading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">
        Settings / Advanced / Danger Zone
      </div>
      <h1 className="mb-6 text-xl font-semibold text-white">Danger Zone</h1>

      {/* Delete Deployment Section */}
      {project && (
        <section className="mb-8 rounded-xl border border-red-900/50 bg-red-950/20 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">
              Delete deployment
            </h2>
          </div>

          <p className="mb-4 text-sm text-gray-300">
            Permanently delete the deployment{" "}
            <strong className="text-white">{project.name}</strong> and all of
            its data. This includes all pages, deployments, analytics, and
            configuration. This action cannot be undone.
          </p>

          <div className="mb-4 space-y-1.5">
            <label
              htmlFor="deploy-reason"
              className="block text-sm font-medium text-gray-300"
            >
              Reason for deletion
            </label>
            <textarea
              id="deploy-reason"
              value={deployReason}
              onChange={(e) => setDeployReason(e.target.value)}
              placeholder="Why are you deleting this deployment?"
              rows={3}
              className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          {deployError && (
            <p className="mb-4 text-sm text-red-400">{deployError}</p>
          )}

          <button
            type="button"
            disabled={deployReason.trim().length < MIN_REASON_LENGTH}
            onClick={() => {
              setShowDeployConfirm(true);
              setDeployConfirmText("");
            }}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete {project.name}
          </button>
        </section>
      )}

      {/* Delete Organization Section */}
      {org && (
        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">
              Delete organization
            </h2>
          </div>

          <div className="mb-4 rounded-lg border border-red-800/60 bg-red-900/30 px-4 py-3">
            <p className="text-sm font-semibold text-red-300">
              CRITICAL ACTION
            </p>
            <p className="mt-1 text-sm text-red-200/80">
              Deleting the organization{" "}
              <strong className="text-white">{org.name}</strong> will
              permanently remove all projects, members, API keys, deployments,
              and data. All team members will lose access immediately. This
              action is irreversible.
            </p>
          </div>

          <div className="mb-4 space-y-1.5">
            <label
              htmlFor="org-reason"
              className="block text-sm font-medium text-gray-300"
            >
              Reason for deletion
            </label>
            <textarea
              id="org-reason"
              value={orgReason}
              onChange={(e) => setOrgReason(e.target.value)}
              placeholder="Why are you deleting this organization?"
              rows={3}
              className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          {orgError && <p className="mb-4 text-sm text-red-400">{orgError}</p>}

          <button
            type="button"
            disabled={orgReason.trim().length < MIN_REASON_LENGTH}
            onClick={() => {
              setShowOrgConfirm(true);
              setOrgConfirmText("");
            }}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete {org.name}
          </button>
        </section>
      )}

      {/* Deployment Confirmation Dialog */}
      {showDeployConfirm && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Confirm deployment deletion
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              This will permanently delete{" "}
              <strong className="text-white">{project.name}</strong> and all
              associated data. Type the deployment name to confirm.
            </p>

            <div className="mb-4 space-y-1.5">
              <label
                htmlFor="deploy-confirm"
                className="block text-sm text-gray-400"
              >
                Type{" "}
                <span className="font-mono text-white">{project.name}</span> to
                confirm
              </label>
              <input
                id="deploy-confirm"
                type="text"
                value={deployConfirmText}
                onChange={(e) => setDeployConfirmText(e.target.value)}
                placeholder={project.name}
                className="w-full rounded-lg border border-white/[0.08] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeployConfirm(false)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deployConfirmText !== project.name || deletingDeploy}
                onClick={handleDeleteDeployment}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingDeploy ? "Deleting..." : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Confirmation Dialog */}
      {showOrgConfirm && org && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Confirm organization deletion
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              This is a{" "}
              <strong className="text-red-400">
                permanent, irreversible action
              </strong>
              . All projects, members, and data in{" "}
              <strong className="text-white">{org.name}</strong> will be deleted
              forever.
            </p>

            <div className="mb-4 space-y-1.5">
              <label
                htmlFor="org-confirm"
                className="block text-sm text-gray-400"
              >
                Type <span className="font-mono text-white">{org.name}</span> to
                confirm
              </label>
              <input
                id="org-confirm"
                type="text"
                value={orgConfirmText}
                onChange={(e) => setOrgConfirmText(e.target.value)}
                placeholder={org.name}
                className="w-full rounded-lg border border-white/[0.08] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowOrgConfirm(false)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={orgConfirmText !== org.name || deletingOrg}
                onClick={handleDeleteOrg}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingOrg ? "Deleting..." : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
