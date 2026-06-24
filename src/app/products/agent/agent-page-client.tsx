"use client";

import { clsx } from "clsx";
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  GitPullRequest,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState as SharedEmptyState } from "@/components/empty-state";
import type { AgentJobStatus } from "@/lib/agent-dashboard";
import {
  extractPrNumber,
  statusColor,
  statusLabel,
  timeAgo,
  truncatePrompt,
  validatePrompt,
} from "@/lib/agent-dashboard";
import { agentEmptyState } from "@/lib/empty-states";

interface JobSummary {
  id: string;
  prompt: string;
  status: string;
  prUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobDetail extends JobSummary {
  projectId?: string;
  messages: { role: "user" | "agent"; content: string; timestamp: string }[];
}

interface AgentPageClientProps {
  hasProject: boolean;
  initialJobs: JobSummary[];
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status as AgentJobStatus);
  const label = statusLabel(status as AgentJobStatus);

  const colorClasses: Record<string, string> = {
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green:
      "bg-[var(--od-sage-soft)] text-[var(--od-success)] border-[var(--od-sage)]",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const dotClasses: Record<string, string> = {
    yellow: "bg-yellow-400",
    blue: "bg-blue-400",
    green: "bg-[var(--od-success)]",
    red: "bg-red-400",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        colorClasses[color] ?? colorClasses.yellow,
      )}
      data-testid="status-badge"
    >
      <span
        className={clsx(
          "w-1.5 h-1.5 rounded-full",
          status === "running" && "animate-pulse",
          dotClasses[color] ?? dotClasses.yellow,
        )}
      />
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <SharedEmptyState
      icon={<Bot size={32} className="text-[var(--od-accent)]" />}
      title={agentEmptyState.title}
      description={agentEmptyState.description}
      action={{
        label: agentEmptyState.ctaLabel,
        href: agentEmptyState.ctaHref,
      }}
    />
  );
}

function JobListItem({
  job,
  onSelect,
}: {
  job: JobSummary;
  onSelect: (id: string) => void;
}) {
  const prNum = extractPrNumber(job.prUrl);

  return (
    <button
      type="button"
      onClick={() => onSelect(job.id)}
      className="w-full text-left px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
      data-testid="agent-job-item"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">
            {truncatePrompt(job.prompt, 120)}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <StatusBadge status={job.status} />
            <span className="text-xs text-gray-500">
              {timeAgo(job.createdAt)}
            </span>
            {prNum !== null && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--od-accent)]">
                <GitPullRequest size={12} />#{prNum}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function JobDetail({
  job,
  onBack,
  onSendMessage,
  sending,
}: {
  job: JobDetail;
  onBack: () => void;
  onSendMessage: (content: string) => void;
  sending: boolean;
}) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canSend = job.status === "pending" || job.status === "running";

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [job.messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    onSendMessage(trimmed);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full" data-testid="agent-job-detail">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
          aria-label="Back to job list"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {truncatePrompt(job.prompt, 60)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={job.status} />
            <span className="text-xs text-gray-500">
              {timeAgo(job.createdAt)}
            </span>
          </div>
        </div>
        {job.prUrl && (
          <a
            href={job.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--od-accent-soft)] text-[var(--od-accent-strong)] text-xs font-medium hover:bg-[var(--od-accent-soft)] transition-colors"
            data-testid="pr-link"
          >
            <GitPullRequest size={14} />
            PR #{extractPrNumber(job.prUrl)}
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {job.messages.map((msg, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: agent stream messages do not expose a stable message id
            key={`${msg.timestamp}-${i}`}
            className={clsx(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={clsx(
                "max-w-[80%] rounded-lg px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-[var(--od-accent-soft)] text-[var(--od-text)]"
                  : "bg-white/[0.05] text-gray-300",
              )}
              data-testid={`message-${msg.role}`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] mt-1 opacity-50">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      {canSend && (
        <form
          onSubmit={handleSubmit}
          className="px-6 py-4 border-t border-white/[0.06]"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send a follow-up message…"
              className="flex-1 bg-[var(--od-panel)] border border-[var(--od-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] focus:outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
              data-testid="message-input"
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-4 py-2.5 rounded-lg bg-[var(--od-accent-strong)] text-white text-sm font-medium hover:bg-[var(--od-accent-deep,#3d4ea4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="send-message-btn"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function AgentPageClient({
  hasProject,
  initialJobs,
}: AgentPageClientProps) {
  const [jobs, setJobs] = useState<JobSummary[]>(initialJobs);
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshJobs = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/agent/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh every 5s when there are active jobs
  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === "pending" || j.status === "running",
    );
    if (!hasActive) return;

    const interval = setInterval(refreshJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs, refreshJobs]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid prompt");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/agent/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create job");
        return;
      }

      const newJob = await res.json();
      setJobs((prev) => [newJob, ...prev]);
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/agent/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJob(data);
      }
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedJob) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/agent/jobs/${selectedJob.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedJob(updated);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // Detail view
  if (selectedJob) {
    return (
      <div className="flex flex-col h-full min-h-[calc(100vh-3rem)]">
        <JobDetail
          job={selectedJob}
          onBack={() => {
            setSelectedJob(null);
            refreshJobs();
          }}
          onSendMessage={handleSendMessage}
          sending={sendingMessage}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col h-full" data-testid="agent-page">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Agent</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Keep your docs up-to-date by leveraging AI
            </p>
          </div>
          <button
            type="button"
            onClick={refreshJobs}
            disabled={refreshing}
            className="p-2 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Refresh jobs"
            data-testid="refresh-jobs-btn"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Prompt input */}
      {hasProject && (
        <form
          onSubmit={handleCreateJob}
          className="px-6 py-4 border-b border-white/[0.06]"
          data-testid="create-job-form"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError(null);
              }}
              placeholder="Enter a prompt for the agent…"
              className="flex-1 bg-[var(--od-panel)] border border-[var(--od-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] focus:outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
              data-testid="prompt-input"
            />
            <button
              type="submit"
              disabled={submitting || !prompt.trim()}
              className="px-4 py-2.5 rounded-lg bg-[var(--od-accent-strong)] text-white text-sm font-medium hover:bg-[var(--od-accent-deep,#3d4ea4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              data-testid="create-job-btn"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Bot size={16} />
              )}
              Create Job
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400" data-testid="prompt-error">
              {error}
            </p>
          )}
        </form>
      )}

      {/* Job list */}
      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <EmptyState />
        ) : (
          <div data-testid="agent-job-list">
            {jobs.map((job) => (
              <JobListItem key={job.id} job={job} onSelect={handleSelectJob} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
