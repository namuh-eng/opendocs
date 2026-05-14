"use client";

import {
  buildQuickActionCards,
  buildSiteUrl,
  formatDomainDisplay,
} from "@/lib/dashboard";
import {
  type DeploymentStatus,
  generateDeploymentLogSteps,
  shortSha,
  statusColor,
  statusDotColor,
  statusLabel,
  timeAgo,
} from "@/lib/deployments";
import { clsx } from "clsx";
import {
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  GitBranch,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DeploymentRow {
  id: string;
  status: string;
  branch: string | null;
  previewUrl: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  subdomain: string | null;
  status: string;
  customDomain: string | null;
  repoUrl: string | null;
  repoBranch: string | null;
  repoPath: string | null;
}

interface Props {
  greeting: string;
  firstName: string;
  project: ProjectInfo | null;
  deployments: DeploymentRow[];
  previews: DeploymentRow[];
  publishedPages: Array<{ id: string; path: string; title: string }>;
}

const ICON_MAP = {
  edit: Edit3,
  globe: Globe,
  settings: Settings,
  "bar-chart": BarChart3,
} as const;

function parseRepoOwner(repoUrl: string | null) {
  if (!repoUrl) return null;

  const match = repoUrl.match(/github\.com[:/]([^/]+)\//i);
  return match?.[1] ?? null;
}

function formatRepoPath(repoPath: string | null) {
  if (!repoPath || repoPath === "/") return null;
  return repoPath.replace(/^\//, "");
}

function ProjectStatusBadge({ status }: { status: string }) {
  const isLive = status === "active";
  const isDeploying = status === "deploying";
  return (
    <span
      data-testid="project-status-badge"
      className={clsx(
        "inline-flex w-20 items-center justify-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        isLive && "bg-emerald-500/10 text-[var(--od-success)]",
        isDeploying && "bg-amber-400/10 text-amber-500",
        !isLive && !isDeploying && "bg-red-400/10 text-[var(--od-danger)]",
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isLive && "bg-[var(--od-success)]",
          isDeploying && "bg-amber-400 animate-pulse",
          !isLive && !isDeploying && "bg-[var(--od-danger)]",
        )}
      />
      {isLive ? "Live" : isDeploying ? "Updating" : "Error"}
    </span>
  );
}

function DeploymentStatusBadge({ status }: { status: string }) {
  const s = status as DeploymentStatus;
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        statusColor(s),
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full", statusDotColor(s))} />
      {statusLabel(s)}
    </span>
  );
}

function DeploymentExpandedRow({ deployment }: { deployment: DeploymentRow }) {
  const logSteps = generateDeploymentLogSteps();
  const isComplete =
    deployment.status === "succeeded" || deployment.status === "failed";

  return (
    <div className="border-t border-[var(--od-border-light)] bg-[var(--od-panel-muted)] px-5 py-4">
      <div className="grid grid-cols-2 gap-8">
        {/* Left: commit details + files */}
        <div className="space-y-4">
          {deployment.status === "succeeded" && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle
                size={16}
                className="mt-0.5 shrink-0 text-[var(--od-success)]"
              />
              <div>
                <p className="font-medium text-[var(--od-text)]">
                  Update successful
                </p>
                <p className="text-xs text-[var(--od-text-subtle)]">
                  Your changes are now live
                </p>
              </div>
            </div>
          )}

          {deployment.commitSha && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--od-text-muted)]">
                Commit details
              </p>
              <div className="flex items-center gap-2 text-sm text-[var(--od-text-muted)]">
                <span className="text-[var(--od-text-subtle)]">source</span>
                <span>refs/heads/main</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--od-text-muted)]">
                <span className="text-[var(--od-text-subtle)]">commit</span>
                <span className="font-mono">
                  {shortSha(deployment.commitSha)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: deployment log */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--od-text-muted)]">
            Deployment log
          </p>
          <div className="space-y-1.5">
            {logSteps.map((step, i) => {
              const showCheck = isComplete || i < logSteps.length - 1;
              return (
                <div key={step} className="flex items-center gap-2 text-sm">
                  {showCheck ? (
                    <CheckCircle
                      size={14}
                      className="shrink-0 text-[var(--od-success)]"
                    />
                  ) : (
                    <Loader2
                      size={14}
                      className="shrink-0 animate-spin text-amber-400"
                    />
                  )}
                  <span className="text-[var(--od-text-muted)]">{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardHomeClient({
  greeting,
  firstName,
  project,
  deployments,
  previews,
  publishedPages,
}: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "previews">("live");
  const [triggering, setTriggering] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [creatingPreview, setCreatingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewBranch, setPreviewBranch] = useState("");
  const [pageViews, setPageViews] = useState<Record<string, number>>({});

  const latestDeployment = deployments[0] ?? null;
  const lastDeployedLabel = latestDeployment
    ? `${latestDeployment.commitMessage ?? "Initializing Project"} ${timeAgo(latestDeployment.createdAt)}`
    : null;

  const projectIsLive = project?.status === "active";
  const siteUrl =
    project && projectIsLive
      ? buildSiteUrl(project.subdomain, project.customDomain)
      : "#";
  const domainDisplay = project
    ? formatDomainDisplay(project.subdomain, project.customDomain)
    : "";
  const repoOwner = project ? parseRepoOwner(project.repoUrl) : null;
  const repoPath = project ? formatRepoPath(project.repoPath) : null;
  const repoBranch = project?.repoBranch ?? null;

  const quickActions = project ? buildQuickActionCards(project.id) : [];
  // Fill in the view-site href dynamically
  for (const card of quickActions) {
    if (card.id === "view-site") {
      card.href = siteUrl;
    }
  }

  useEffect(() => {
    if (project) {
      fetch(`/api/analytics/views?projectId=${project.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.topPages) {
            const views: Record<string, number> = {};
            for (const page of data.topPages as Array<{
              pagePath: string;
              views: number;
            }>) {
              views[page.pagePath] = page.views;
            }
            setPageViews(views);
          }
        });
    }
  }, [project]);

  async function triggerDeploy() {
    setTriggering(true);
    try {
      await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitMessage: "Manual Update" }),
      });
      router.refresh();
    } finally {
      setTriggering(false);
    }
  }

  async function triggerSync() {
    if (!project) return;
    setSyncing(true);
    try {
      await fetch(`/api/projects/${project.id}/sync`, {
        method: "POST",
      });
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  async function createPreview() {
    if (!previewBranch.trim()) return;
    setCreatingPreview(true);
    try {
      await fetch("/api/deployments/previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: previewBranch.trim() }),
      });
      setShowPreviewModal(false);
      setPreviewBranch("");
      router.refresh();
    } finally {
      setCreatingPreview(false);
    }
  }

  return (
    <div className="od-page">
      {/* Greeting */}
      <div className="mb-[var(--od-section-gap)] flex items-center justify-between">
        <h1 className="text-[length:var(--od-fs-xl)] font-bold text-[var(--od-text)]">
          {greeting}, {firstName}
        </h1>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--od-text-muted)] transition-colors hover:bg-[var(--od-panel-muted)] hover:text-[var(--od-text)]"
        >
          Things to do
          <ChevronDown size={14} />
        </button>
      </div>

      {project ? (
        <>
          {/* Project overview section */}
          <div className="mb-[var(--od-section-gap)] flex gap-6 max-lg:flex-col">
            {/* Preview thumbnail placeholder */}
            <div className="od-card flex h-[170px] w-[300px] shrink-0 items-center justify-center overflow-hidden max-lg:w-full">
              <div className="text-center">
                <Globe
                  size={28}
                  className="mx-auto mb-2 text-[var(--od-text-subtle)]"
                />
                <p className="text-xs text-[var(--od-text-subtle)]">
                  Site preview
                </p>
              </div>
            </div>

            {/* Project info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-[length:var(--od-fs-lg)] font-semibold text-[var(--od-text)]">
                  {project.name}
                </h2>
                <ProjectStatusBadge status={project.status} />
              </div>

              {lastDeployedLabel && (
                <p className="text-sm text-[var(--od-text-muted)]">
                  {lastDeployedLabel}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={triggerDeploy}
                  disabled={triggering}
                  className="od-button od-icon-button disabled:opacity-50"
                  title="Trigger deployment"
                >
                  {triggering ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Rocket size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={triggerSync}
                  disabled={syncing}
                  className="od-button od-icon-button disabled:opacity-50"
                  title="Sync from GitHub"
                >
                  {syncing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                </button>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!projectIsLive}
                  className={clsx(
                    "od-button px-3 py-1.5",
                    projectIsLive
                      ? ""
                      : "pointer-events-none cursor-not-allowed opacity-60",
                  )}
                >
                  <ExternalLink size={14} />
                  Visit site
                </a>
              </div>

              {(repoOwner || repoPath || repoBranch) && (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] px-3 py-2 text-xs text-[var(--od-text-muted)]">
                  {repoOwner && (
                    <span className="text-[var(--od-text)]">{repoOwner}</span>
                  )}
                  {repoPath && (
                    <>
                      <span className="text-[var(--od-text-subtle)]">/</span>
                      <span className="text-[var(--od-text)]">{repoPath}</span>
                    </>
                  )}
                  {repoBranch && (
                    <>
                      <span className="text-[var(--od-text-subtle)]">
                        branch
                      </span>
                      <span className="text-[var(--od-text)]">
                        {repoBranch}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Domain info */}
              <div className="space-y-1 pt-2">
                <p className="text-xs font-medium text-[var(--od-text-subtle)]">
                  Domain
                </p>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="site-url-link"
                  aria-disabled={!projectIsLive}
                  className={clsx(
                    "text-sm inline-flex items-center gap-1",
                    projectIsLive
                      ? "text-[var(--od-accent)] hover:underline"
                      : "pointer-events-none cursor-not-allowed text-[var(--od-text-subtle)]",
                  )}
                >
                  {domainDisplay}
                  <ExternalLink
                    size={12}
                    className="text-[var(--od-text-subtle)]"
                  />
                </a>
                {!project.customDomain && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-[var(--od-text-subtle)] hover:text-[var(--od-text-muted)]"
                  >
                    <Plus size={12} />
                    Add custom domain
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick action cards */}
          <div className="mb-[var(--od-section-gap)] grid grid-cols-4 gap-[var(--od-card-gap)] max-md:grid-cols-2 max-sm:grid-cols-1">
            {quickActions.map((card) => {
              const IconComponent = ICON_MAP[card.icon];
              const isExternal = card.id === "view-site";
              const Wrapper = isExternal ? "a" : Link;
              const extraProps = isExternal
                ? {
                    target: "_blank" as const,
                    rel: "noopener noreferrer",
                    "aria-disabled": !projectIsLive,
                  }
                : {};
              return (
                <Wrapper
                  key={card.id}
                  href={card.href}
                  data-testid={`quick-action-card-${card.id}`}
                  className={clsx(
                    "od-card od-card-hover group p-[var(--od-card-pad)]",
                    isExternal && !projectIsLive
                      ? "pointer-events-none cursor-not-allowed opacity-60"
                      : "cursor-pointer",
                  )}
                  {...extraProps}
                >
                  <div
                    data-testid="quick-action-card"
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--od-panel-muted)] transition-colors group-hover:bg-[var(--od-accent-soft)]">
                      <IconComponent
                        size={16}
                        className="text-[var(--od-text-muted)] transition-colors group-hover:text-[var(--od-accent)]"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--od-text)]">
                        {card.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--od-text-subtle)]">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>

          {/* Activity section */}
          <div>
            <h3 className="mb-3 text-[length:var(--od-fs-lg)] font-semibold text-[var(--od-text)]">
              Activity
            </h3>

            {/* Tabs */}
            <div className="mb-4 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeTab === "live"
                    ? "bg-[var(--od-panel-muted)] font-medium text-[var(--od-text)]"
                    : "text-[var(--od-text-subtle)] hover:text-[var(--od-text-muted)]",
                )}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("previews")}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeTab === "previews"
                    ? "bg-[var(--od-panel-muted)] font-medium text-[var(--od-text)]"
                    : "text-[var(--od-text-subtle)] hover:text-[var(--od-text-muted)]",
                )}
              >
                Previews
              </button>
            </div>

            {/* Deployment table */}
            {activeTab === "live" && (
              <div className="overflow-hidden rounded-[var(--od-card-radius)] border border-[var(--od-border)] bg-[var(--od-panel)] shadow-[var(--od-shadow)]">
                {/* Table header */}
                <div className="od-table-head grid grid-cols-[1fr_120px_1fr_32px] gap-4 border-b border-[var(--od-border)] px-5 py-3 max-md:hidden">
                  <span>Update</span>
                  <span>Status</span>
                  <span>Changes</span>
                  <span />
                </div>

                {deployments.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[var(--od-text-subtle)]">
                    No deployments yet. Trigger your first deployment to get
                    started.
                  </div>
                ) : (
                  deployments.map((d) => {
                    const isExpanded = expandedId === d.id;
                    return (
                      <div
                        key={d.id}
                        className="border-t border-[var(--od-border-light)] first:border-t-0"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : d.id)
                          }
                          className="grid w-full grid-cols-[1fr_120px_1fr_32px] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-[var(--od-panel-muted)] max-md:grid-cols-[1fr_auto] max-md:gap-3"
                        >
                          {/* Update */}
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--od-border)] bg-[var(--od-panel-muted)]">
                              <Rocket
                                size={14}
                                className="text-[var(--od-text-muted)]"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--od-text)]">
                                {d.commitMessage ?? "Initializing Project"}
                              </p>
                              <p className="text-xs text-[var(--od-text-subtle)]">
                                {timeAgo(d.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Status */}
                          <DeploymentStatusBadge status={d.status} />

                          {/* Changes */}
                          <div className="text-sm text-[var(--od-text-muted)] max-md:col-span-2">
                            {d.commitMessage ?? "Initial commit"}
                            {d.commitSha && (
                              <span className="ml-2 font-mono text-xs text-[var(--od-text-subtle)]">
                                {shortSha(d.commitSha)}
                              </span>
                            )}
                          </div>

                          {/* Expand */}
                          <div className="text-[var(--od-text-subtle)] max-md:hidden">
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </div>
                        </button>

                        {isExpanded && <DeploymentExpandedRow deployment={d} />}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "previews" && (
              <div>
                {/* Create custom preview button */}
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    data-testid="create-preview-btn"
                    className="od-button od-button-primary px-3 py-1.5"
                  >
                    <Plus size={14} />
                    Create custom preview
                  </button>
                </div>

                {/* Preview modal */}
                {showPreviewModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div
                      data-testid="preview-modal"
                      className="w-[420px] rounded-[var(--od-card-radius)] border border-[var(--od-border)] bg-[var(--od-panel)] p-6 shadow-2xl"
                    >
                      <h3 className="mb-4 text-lg font-medium text-[var(--od-text)]">
                        Create custom preview
                      </h3>
                      <label
                        htmlFor="preview-branch"
                        className="mb-1.5 block text-sm text-[var(--od-text-muted)]"
                      >
                        Branch name
                      </label>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--od-border)] bg-[var(--od-panel-muted)] px-3 py-2">
                          <GitBranch
                            size={14}
                            className="shrink-0 text-[var(--od-text-subtle)]"
                          />
                          <input
                            id="preview-branch"
                            type="text"
                            value={previewBranch}
                            onChange={(e) => setPreviewBranch(e.target.value)}
                            placeholder="feature/my-branch"
                            data-testid="preview-branch-input"
                            className="flex-1 bg-transparent text-sm text-[var(--od-text)] outline-none placeholder:text-[var(--od-text-subtle)]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPreviewModal(false);
                            setPreviewBranch("");
                          }}
                          className="rounded-md px-3 py-1.5 text-sm text-[var(--od-text-muted)] transition-colors hover:bg-[var(--od-panel-muted)] hover:text-[var(--od-text)]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={createPreview}
                          disabled={creatingPreview || !previewBranch.trim()}
                          data-testid="confirm-create-preview"
                          className="od-button od-button-primary px-3 py-1.5 disabled:opacity-50"
                        >
                          {creatingPreview ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Rocket size={14} />
                          )}
                          Deploy preview
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview deployments table */}
                <div className="overflow-hidden rounded-[var(--od-card-radius)] border border-[var(--od-border)] bg-[var(--od-panel)] shadow-[var(--od-shadow)]">
                  {/* Table header */}
                  <div className="od-table-head grid grid-cols-[1fr_140px_120px_100px_1fr] gap-4 border-b border-[var(--od-border)] px-5 py-3 max-md:hidden">
                    <span>Branch</span>
                    <span>Preview URL</span>
                    <span>Status</span>
                    <span>Commit</span>
                    <span>Timestamp</span>
                  </div>

                  {previews.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-[var(--od-text-subtle)]">
                      No preview deployments yet. Push to a branch or click
                      &ldquo;Create custom preview&rdquo; to get started.
                    </div>
                  ) : (
                    previews.map((p) => (
                      <div
                        key={p.id}
                        data-testid="preview-row"
                        className="grid grid-cols-[1fr_140px_120px_100px_1fr] items-center gap-4 border-t border-[var(--od-border-light)] px-5 py-3 transition-colors hover:bg-[var(--od-panel-muted)] max-md:grid-cols-2"
                      >
                        {/* Branch */}
                        <div className="flex items-center gap-2">
                          <GitBranch
                            size={14}
                            className="shrink-0 text-[var(--od-text-subtle)]"
                          />
                          <span className="truncate text-sm font-medium text-[var(--od-text)]">
                            {p.branch ?? "unknown"}
                          </span>
                        </div>

                        {/* Preview URL */}
                        <div className="truncate">
                          {p.previewUrl ? (
                            <a
                              href={p.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[var(--od-accent)] hover:underline"
                            >
                              <ExternalLink size={10} className="shrink-0" />
                              <span className="truncate">Preview</span>
                            </a>
                          ) : (
                            <span className="text-xs text-[var(--od-text-subtle)]">
                              —
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <DeploymentStatusBadge status={p.status} />

                        {/* Commit */}
                        <div className="font-mono text-xs text-[var(--od-text-muted)]">
                          {p.commitSha ? shortSha(p.commitSha) : "—"}
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-[var(--od-text-subtle)]">
                          {timeAgo(p.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pages List */}
                {publishedPages.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-4 text-sm font-medium text-[var(--od-text)]">
                      Pages
                    </h3>
                    <div className="overflow-hidden rounded-[var(--od-card-radius)] border border-[var(--od-border)] bg-[var(--od-panel)] shadow-[var(--od-shadow)]">
                      <div className="od-table-head grid grid-cols-[1fr_120px_100px] gap-4 border-b border-[var(--od-border)] px-5 py-3">
                        <span>Title</span>
                        <span>Views</span>
                        <span className="text-right">Actions</span>
                      </div>
                      <div className="divide-y divide-[var(--od-border-light)]">
                        {publishedPages.map((page) => (
                          <div
                            key={page.id}
                            className="grid grid-cols-[1fr_120px_100px] items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--od-panel-muted)]"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-[var(--od-text)]">
                                {page.title}
                              </div>
                              <div className="truncate text-xs text-[var(--od-text-subtle)]">
                                {page.path}
                              </div>
                            </div>
                            <div className="text-sm tabular-nums text-[var(--od-text-muted)]">
                              {(
                                pageViews[
                                  page.path === "introduction"
                                    ? "/"
                                    : `/${page.path}`
                                ] || 0
                              ).toLocaleString()}
                            </div>
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/editor/main?pageId=${page.id}`}
                                className="p-1 text-[var(--od-text-subtle)] transition-colors hover:text-[var(--od-text)]"
                                title="Edit page"
                              >
                                <Edit3 size={14} />
                              </Link>
                              <a
                                href={
                                  buildSiteUrl(
                                    project.subdomain,
                                    project.customDomain,
                                  ) +
                                  (page.path === "introduction"
                                    ? ""
                                    : `/${page.path}`)
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-[var(--od-text-subtle)] transition-colors hover:text-[var(--od-accent)]"
                                title="View live"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="od-panel p-8 text-center text-[var(--od-text-subtle)]">
          <p>
            No project yet. Create your first documentation project to get
            started.
          </p>
        </div>
      )}
    </div>
  );
}
