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
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeploymentRow {
  id: string;
  status: string;
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

interface Props {
  greeting: string;
  firstName: string;
  project: ProjectInfo | null;
  deployments: DeploymentRow[];
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
}: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "previews">("live");
  const [triggering, setTriggering] = useState(false);

  const latestDeployment = deployments[0] ?? null;
  const lastDeployedLabel = latestDeployment
    ? `${latestDeployment.commitMessage ?? "Initializing Project"} ${timeAgo(latestDeployment.createdAt)}`
    : null;

  const siteUrl = project
    ? buildSiteUrl(project.subdomain, project.customDomain)
    : "#";
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
              <div className="rounded-xl border border-white/[0.08] px-6 py-8 text-center text-gray-500 text-sm">
                No preview deployments yet. Push to a branch to create a
                preview.
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
