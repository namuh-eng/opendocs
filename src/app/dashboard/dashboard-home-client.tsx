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
import { useMemo, useState } from "react";

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
}

interface ManualHandoffRow {
  id: string;
  action: string;
  createdAt: string;
  details: Record<string, unknown> & {
    resolution?: {
      resolvedByUserId?: string;
      resolvedByName?: string | null;
      resolvedAt?: string;
      resolutionNote?: string | null;
    };
  };
}

const HANDOFF_FILTERS = [
  { key: "all", label: "All" },
  { key: "deployment", label: "Deployments" },
  { key: "agent", label: "Agent jobs" },
] as const;

function classifyHandoffAction(action: string) {
  if (action.includes("agent")) return "agent" as const;
  if (action.includes("deployment")) return "deployment" as const;
  return "all" as const;
}

function formatDuration(from: string, to: string) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const diffMs = end - start;

  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m open`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m open` : `${hours}h open`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h open` : `${days}d open`;
}

interface Props {
  greeting: string;
  firstName: string;
  project: ProjectInfo | null;
  deployments: DeploymentRow[];
  previews: DeploymentRow[];
  manualHandoffs: ManualHandoffRow[];
  resolvedManualHandoffs: ManualHandoffRow[];
}

const ICON_MAP = {
  edit: Edit3,
  globe: Globe,
  settings: Settings,
  "bar-chart": BarChart3,
} as const;

function ProjectStatusBadge({ status }: { status: string }) {
  const isLive = status === "active";
  const isDeploying = status === "deploying";
  return (
    <span
      data-testid="project-status-badge"
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        isLive && "bg-emerald-400/10 text-emerald-400",
        isDeploying && "bg-amber-400/10 text-amber-400",
        !isLive && !isDeploying && "bg-red-400/10 text-red-400",
      )}
    >
      <span
        className={clsx(
          "w-1.5 h-1.5 rounded-full",
          isLive && "bg-emerald-400",
          isDeploying && "bg-amber-400 animate-pulse",
          !isLive && !isDeploying && "bg-red-400",
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
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
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
    <div className="px-6 py-4 bg-[#0f0f0f] border-t border-white/[0.04]">
      <div className="grid grid-cols-2 gap-8">
        {/* Left: commit details + files */}
        <div className="space-y-4">
          {deployment.status === "succeeded" && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle
                size={16}
                className="text-emerald-400 mt-0.5 shrink-0"
              />
              <div>
                <p className="text-white font-medium">Update successful</p>
                <p className="text-gray-500 text-xs">
                  Your changes are now live
                </p>
              </div>
            </div>
          )}

          {deployment.commitSha && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-400">
                Commit details
              </p>
              <div className="text-sm text-gray-300 flex items-center gap-2">
                <span className="text-gray-500">source</span>
                <span>refs/heads/main</span>
              </div>
              <div className="text-sm text-gray-300 flex items-center gap-2">
                <span className="text-gray-500">commit</span>
                <span className="font-mono">
                  {shortSha(deployment.commitSha)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: deployment log */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400">Deployment log</p>
          <div className="space-y-1.5">
            {logSteps.map((step, i) => {
              const showCheck = isComplete || i < logSteps.length - 1;
              return (
                <div key={step} className="flex items-center gap-2 text-sm">
                  {showCheck ? (
                    <CheckCircle
                      size={14}
                      className="text-emerald-400 shrink-0"
                    />
                  ) : (
                    <Loader2
                      size={14}
                      className="text-amber-400 animate-spin shrink-0"
                    />
                  )}
                  <span className="text-gray-300">{step}</span>
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
  manualHandoffs,
  resolvedManualHandoffs,
}: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "previews">("live");
  const [triggering, setTriggering] = useState(false);
  const [creatingPreview, setCreatingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewBranch, setPreviewBranch] = useState("");
  const [handoffFilter, setHandoffFilter] = useState<
    (typeof HANDOFF_FILTERS)[number]["key"]
  >("all");
  const [resolvingHandoffId, setResolvingHandoffId] = useState<string | null>(
    null,
  );
  const [dismissedHandoffIds, setDismissedHandoffIds] = useState<string[]>([]);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  const [handoffResolutionNotes, setHandoffResolutionNotes] = useState<
    Record<string, string>
  >({});
  const [expandedNoteHandoffId, setExpandedNoteHandoffId] = useState<string | null>(
    null,
  );
  const [handoffSort, setHandoffSort] = useState<"newest" | "oldest" | "longest-open">(
    "newest",
  );
  const [handoffView, setHandoffView] = useState<"active" | "resolved">(
    "active",
  );

  const latestDeployment = deployments[0] ?? null;
  const lastDeployedLabel = latestDeployment
    ? `${latestDeployment.commitMessage ?? "Initializing Project"} ${timeAgo(latestDeployment.createdAt)}`
    : null;

  const siteUrl = project
    ? buildSiteUrl(project.subdomain, project.customDomain)
    : "#";
  const visibleManualHandoffs = useMemo(
    () =>
      manualHandoffs.filter(
        (handoff) => !dismissedHandoffIds.includes(handoff.id),
      ),
    [dismissedHandoffIds, manualHandoffs],
  );

  const handoffRows = handoffView === "active" ? visibleManualHandoffs : resolvedManualHandoffs;

  const filteredManualHandoffs = handoffRows.filter((handoff) => {
    if (handoffFilter === "all") return true;
    return classifyHandoffAction(handoff.action) === handoffFilter;
  });

  const sortedManualHandoffs = [...filteredManualHandoffs].sort((a, b) => {
    if (handoffSort === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    if (handoffSort === "longest-open") {
      const aResolvedAt = a.details.resolution?.resolvedAt ?? new Date().toISOString();
      const bResolvedAt = b.details.resolution?.resolvedAt ?? new Date().toISOString();
      return (
        new Date(bResolvedAt).getTime() - new Date(b.createdAt).getTime() -
        (new Date(aResolvedAt).getTime() - new Date(a.createdAt).getTime())
      );
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const domainDisplay = project
    ? formatDomainDisplay(project.subdomain, project.customDomain)
    : "";

  const quickActions = project ? buildQuickActionCards(project.id) : [];
  // Fill in the view-site href dynamically
  for (const card of quickActions) {
    if (card.id === "view-site") {
      card.href = siteUrl;
    }
  }

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

  async function resolveHandoff(handoffId: string) {
    setResolvingHandoffId(handoffId);
    try {
      const response = await fetch(
        `/api/analytics/manual-handoffs/${handoffId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: handoffResolutionNotes[handoffId]?.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to resolve handoff");
      }

      setDismissedHandoffIds((current) => [...current, handoffId]);
      setHandoffResolutionNotes((current) => {
        const next = { ...current };
        delete next[handoffId];
        return next;
      });
      setExpandedNoteHandoffId((current) =>
        current === handoffId ? null : current,
      );
      setHandoffNotice("Manual follow-up resolved.");
      router.refresh();
    } catch {
      setHandoffNotice("Could not resolve handoff. Try again.");
    } finally {
      setResolvingHandoffId(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-normal text-white">
          {greeting}, {firstName}
        </h1>
        <button
          type="button"
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
        >
          Things to do
          <ChevronDown size={14} />
        </button>
      </div>

      {project ? (
        <>
          {/* Project overview section */}
          <div className="flex gap-6 mb-6">
            {/* Preview thumbnail placeholder */}
            <div className="w-[320px] h-[180px] rounded-xl bg-[#1a1a1a] border border-white/[0.08] flex items-center justify-center text-gray-600 shrink-0 overflow-hidden">
              <div className="text-center">
                <Globe size={32} className="mx-auto mb-2 text-gray-600" />
                <p className="text-xs text-gray-500">Site preview</p>
              </div>
            </div>

            {/* Project info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-white">
                  {project.name}
                </h2>
                <ProjectStatusBadge status={project.status} />
              </div>

              {lastDeployedLabel && (
                <p className="text-sm text-gray-400">{lastDeployedLabel}</p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={triggerDeploy}
                  disabled={triggering}
                  className="p-2 rounded-md bg-[#1a1a1a] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
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
                  onClick={() => router.refresh()}
                  className="p-2 rounded-md bg-[#1a1a1a] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1a1a1a] border border-white/[0.08] text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <ExternalLink size={14} />
                  Visit site
                </a>
              </div>

              {/* Domain info */}
              <div className="pt-2 space-y-1">
                <p className="text-xs font-medium text-gray-500">Domain</p>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="site-url-link"
                  className="text-sm text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  {domainDisplay}
                  <ExternalLink size={12} className="text-gray-500" />
                </a>
                {!project.customDomain && (
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add custom domain
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick action cards */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {quickActions.map((card) => {
              const IconComponent = ICON_MAP[card.icon];
              const isExternal = card.id === "view-site";
              const Wrapper = isExternal ? "a" : Link;
              const extraProps = isExternal
                ? { target: "_blank" as const, rel: "noopener noreferrer" }
                : {};
              return (
                <Wrapper
                  key={card.id}
                  href={card.href}
                  data-testid={`quick-action-card-${card.id}`}
                  className="group rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-4 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer"
                  {...extraProps}
                >
                  <div
                    data-testid="quick-action-card"
                    className="flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#0f0f0f] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:border-emerald-400/30 transition-colors">
                      <IconComponent
                        size={16}
                        className="text-gray-400 group-hover:text-emerald-400 transition-colors"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {card.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>

          {/* Manual follow-up queue */}
          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-sm font-medium text-white">
                  Manual follow-up queue
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Recent async work that was recorded without a live executor.
                </p>
              </div>
              <span className="text-xs text-amber-300">
                {filteredManualHandoffs.length} shown
              </span>
            </div>

            {handoffNotice ? (
              <div className="mb-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                {handoffNotice}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHandoffView("active")}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-xs transition-colors",
                    handoffView === "active"
                      ? "bg-white/[0.12] text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.06]",
                  )}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffView("resolved")}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-xs transition-colors",
                    handoffView === "resolved"
                      ? "bg-white/[0.12] text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.06]",
                  )}
                >
                  Resolved
                </button>
              </div>

              <div className="flex items-center gap-2">
                {HANDOFF_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setHandoffFilter(filter.key)}
                    className={clsx(
                      "px-2.5 py-1 rounded-md text-xs transition-colors",
                      handoffFilter === filter.key
                        ? "bg-white/[0.12] text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.06]",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
                <select
                  value={handoffSort}
                  onChange={(event) =>
                    setHandoffSort(
                      event.target.value as "newest" | "oldest" | "longest-open",
                    )
                  }
                  className="rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="longest-open">Longest open</option>
                </select>
              </div>
            </div>

            {filteredManualHandoffs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No manual handoffs recorded recently.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedManualHandoffs.slice(0, 5).map((handoff) => (
                  <div
                    key={handoff.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {handoff.action}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {String(handoff.details.projectId ?? handoff.details.deploymentId ?? handoff.details.jobId ?? "manual follow-up required")}
                      </p>
                      {handoffView === "resolved" && handoff.details.resolution ? (
                        <>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            Created {timeAgo(handoff.createdAt)}
                            {handoff.details.resolution.resolvedAt
                              ? ` • Resolved ${timeAgo(handoff.details.resolution.resolvedAt)}`
                              : ""}
                            {handoff.details.resolution.resolvedAt
                              ? ` • ${formatDuration(handoff.createdAt, handoff.details.resolution.resolvedAt) ?? ""}`
                              : ""}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            Resolved by {handoff.details.resolution.resolvedByName ?? handoff.details.resolution.resolvedByUserId ?? "unknown"}
                          </p>
                          {handoff.details.resolution.resolutionNote ? (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              Note: {handoff.details.resolution.resolutionNote}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">
                        {timeAgo(handoff.createdAt)}
                      </span>
                      {handoffView === "active" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedNoteHandoffId((current) =>
                                current === handoff.id ? null : handoff.id,
                              )
                            }
                            className="px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            {expandedNoteHandoffId === handoff.id ? "Hide note" : "Add note"}
                          </button>
                          {expandedNoteHandoffId === handoff.id ? (
                            <input
                              type="text"
                              value={handoffResolutionNotes[handoff.id] ?? ""}
                              onChange={(event) =>
                                setHandoffResolutionNotes((current) => ({
                                  ...current,
                                  [handoff.id]: event.target.value,
                                }))
                              }
                              placeholder="Add note"
                              className="w-36 rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => resolveHandoff(handoff.id)}
                            disabled={resolvingHandoffId === handoff.id}
                            className="px-2 py-1 rounded-md text-xs bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
                          >
                            {resolvingHandoffId === handoff.id ? "Resolving..." : "Resolve"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity section */}
          <div>
            <h3 className="text-base font-medium text-white mb-3">Activity</h3>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === "live"
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-gray-500 hover:text-gray-300",
                )}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("previews")}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeTab === "previews"
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-gray-500 hover:text-gray-300",
                )}
              >
                Previews
              </button>
            </div>

            {/* Deployment table */}
            {activeTab === "live" && (
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_120px_1fr_32px] gap-4 px-6 py-3 bg-[#0f0f0f] text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Update</span>
                  <span>Status</span>
                  <span>Changes</span>
                  <span />
                </div>

                {deployments.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm">
                    No deployments yet. Trigger your first deployment to get
                    started.
                  </div>
                ) : (
                  deployments.map((d) => {
                    const isExpanded = expandedId === d.id;
                    return (
                      <div key={d.id} className="border-t border-white/[0.04]">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : d.id)
                          }
                          className="w-full grid grid-cols-[1fr_120px_1fr_32px] gap-4 px-6 py-3 text-left hover:bg-white/[0.02] transition-colors items-center"
                        >
                          {/* Update */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/[0.08] flex items-center justify-center shrink-0">
                              <Rocket size={14} className="text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">
                                {d.commitMessage ?? "Initializing Project"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {timeAgo(d.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Status */}
                          <DeploymentStatusBadge status={d.status} />

                          {/* Changes */}
                          <div className="text-sm text-gray-400">
                            {d.commitMessage ?? "Initial commit"}
                            {d.commitSha && (
                              <span className="text-gray-600 text-xs ml-2 font-mono">
                                {shortSha(d.commitSha)}
                              </span>
                            )}
                          </div>

                          {/* Expand */}
                          <div className="text-gray-500">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
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
                      className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl p-6 w-[420px] shadow-2xl"
                    >
                      <h3 className="text-lg font-medium text-white mb-4">
                        Create custom preview
                      </h3>
                      <label
                        htmlFor="preview-branch"
                        className="block text-sm text-gray-400 mb-1.5"
                      >
                        Branch name
                      </label>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-[#0f0f0f] border border-white/[0.08]">
                          <GitBranch
                            size={14}
                            className="text-gray-500 shrink-0"
                          />
                          <input
                            id="preview-branch"
                            type="text"
                            value={previewBranch}
                            onChange={(e) => setPreviewBranch(e.target.value)}
                            placeholder="feature/my-branch"
                            data-testid="preview-branch-input"
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
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
                          className="px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={createPreview}
                          disabled={creatingPreview || !previewBranch.trim()}
                          data-testid="confirm-create-preview"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
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
                <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_140px_120px_100px_1fr] gap-4 px-6 py-3 bg-[#0f0f0f] text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>Branch</span>
                    <span>Preview URL</span>
                    <span>Status</span>
                    <span>Commit</span>
                    <span>Timestamp</span>
                  </div>

                  {previews.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500 text-sm">
                      No preview deployments yet. Push to a branch or click
                      &ldquo;Create custom preview&rdquo; to get started.
                    </div>
                  ) : (
                    previews.map((p) => (
                      <div
                        key={p.id}
                        data-testid="preview-row"
                        className="grid grid-cols-[1fr_140px_120px_100px_1fr] gap-4 px-6 py-3 border-t border-white/[0.04] items-center hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Branch */}
                        <div className="flex items-center gap-2">
                          <GitBranch
                            size={14}
                            className="text-gray-500 shrink-0"
                          />
                          <span className="text-sm text-white font-medium truncate">
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
                              className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink size={10} className="shrink-0" />
                              <span className="truncate">Preview</span>
                            </a>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </div>

                        {/* Status */}
                        <DeploymentStatusBadge status={p.status} />

                        {/* Commit */}
                        <div className="text-xs text-gray-400 font-mono">
                          {p.commitSha ? shortSha(p.commitSha) : "—"}
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-gray-500">
                          {timeAgo(p.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-8 text-center text-gray-500">
          <p>
            No project yet. Create your first documentation project to get
            started.
          </p>
        </div>
      )}
    </div>
  );
}
