"use client";

import {
  type BillingUsageSummary,
  calculateBillingUsagePercent,
  createBillingRedirect,
  formatBillingLimit,
  getBillingPlanDetails,
} from "@/lib/billing-client";
import { clsx } from "clsx";
import { ArrowUpRight, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface BillingSettingsClientProps {
  initialPlan?: string;
  redirectTo?: (url: string) => void;
}

type BillingAction = "checkout" | "portal";

interface OrganizationLike {
  plan?: string;
}

interface ProjectLike {
  id: string;
}

interface AssistantUsageLike {
  messagesUsed?: number;
  messageLimit?: number;
}

const DEFAULT_USAGE: BillingUsageSummary = {
  projectsUsed: null,
  projectLimit: null,
  assistantMessagesUsed: null,
  assistantMessageLimit: null,
};

export function BillingSettingsClient({
  initialPlan = "free",
  redirectTo = (url: string) => window.location.assign(url),
}: BillingSettingsClientProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [usage, setUsage] = useState<BillingUsageSummary>(DEFAULT_USAGE);
  const [loadingState, setLoadingState] = useState(true);
  const [actionLoading, setActionLoading] = useState<BillingAction | null>(
    null,
  );
  const [message, setMessage] = useState<{
    type: "info" | "error";
    text: string;
  } | null>(null);

  const planDetails = getBillingPlanDetails(plan);
  const resolvedUsage: BillingUsageSummary = {
    projectsUsed: usage.projectsUsed,
    projectLimit: usage.projectLimit ?? planDetails.projectLimit,
    assistantMessagesUsed: usage.assistantMessagesUsed,
    assistantMessageLimit:
      usage.assistantMessageLimit ?? planDetails.assistantMessageLimit,
  };

  const fetchBillingState = useCallback(async () => {
    setLoadingState(true);
    try {
      const [orgsResult, projectsResult, assistantUsageResult] =
        await Promise.allSettled([
          fetch("/api/orgs"),
          fetch("/api/projects"),
          fetch("/api/assistant/usage"),
        ]);

      if (orgsResult.status === "fulfilled" && orgsResult.value.ok) {
        const data = (await orgsResult.value.json()) as {
          orgs?: OrganizationLike[];
        };
        const orgPlan = data.orgs?.[0]?.plan;
        if (orgPlan) setPlan(orgPlan);
      }

      let projectsUsed: number | null = null;
      if (projectsResult.status === "fulfilled" && projectsResult.value.ok) {
        const data = (await projectsResult.value.json()) as {
          projects?: ProjectLike[];
        };
        projectsUsed = Array.isArray(data.projects)
          ? data.projects.length
          : null;
      }

      let assistantMessagesUsed: number | null = null;
      let assistantMessageLimit: number | null = null;
      if (
        assistantUsageResult.status === "fulfilled" &&
        assistantUsageResult.value.ok
      ) {
        const data = (await assistantUsageResult.value.json()) as {
          usage?: AssistantUsageLike;
        };
        if (typeof data.usage?.messagesUsed === "number") {
          assistantMessagesUsed = data.usage.messagesUsed;
        }
        if (typeof data.usage?.messageLimit === "number") {
          assistantMessageLimit = data.usage.messageLimit;
        }
      }

      setUsage({
        projectsUsed,
        projectLimit: null,
        assistantMessagesUsed,
        assistantMessageLimit,
      });
    } catch {
      setMessage({
        type: "info",
        text: "Billing state is using plan defaults because live usage could not be loaded.",
      });
    } finally {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingState();
  }, [fetchBillingState]);

  const startBillingFlow = async (action: BillingAction) => {
    setActionLoading(action);
    setMessage(null);
    const endpoint =
      action === "checkout" ? "/api/billing/checkout" : "/api/billing/portal";
    const result = await createBillingRedirect(endpoint);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      setActionLoading(null);
      return;
    }

    redirectTo(result.url);
  };

  return (
    <div className="p-6 max-w-4xl" data-testid="billing-settings-page">
      <div className="mb-1 text-sm text-gray-400">
        Settings / Organization / Billing
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Billing</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            OpenDocs is open-source software. This page manages Namuh commercial
            billing for hosted plans or supported self-hosted deployments.
          </p>
        </div>
        <span
          className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300"
          data-testid="billing-status"
        >
          <ShieldCheck size={15} />
          {planDetails.statusLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Current plan</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">
                {planDetails.label}
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                {planDetails.summary}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-right shadow-[0_0_30px_rgba(16,185,129,0.08)]">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Monthly
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-white">
                {planDetails.monthlyPriceLabel}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">per workspace</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <BillingButton
              loading={actionLoading === "checkout"}
              disabled={actionLoading !== null}
              onClick={() => startBillingFlow("checkout")}
              testId="billing-checkout-btn"
            >
              {planDetails.plan === "free"
                ? "Upgrade / Subscribe"
                : "Change plan"}
            </BillingButton>
            <BillingButton
              variant="secondary"
              loading={actionLoading === "portal"}
              disabled={actionLoading !== null}
              onClick={() => startBillingFlow("portal")}
              testId="billing-portal-btn"
            >
              Manage billing
            </BillingButton>
          </div>

          {message && (
            <p
              className={clsx(
                "mt-4 rounded-lg border px-3 py-2 text-sm",
                message.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200",
              )}
              data-testid="billing-message"
            >
              {message.text}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6">
          <h2 className="text-lg font-semibold text-white">Included limits</h2>
          <p className="mt-1 text-sm text-gray-400">
            Defaults are shown when the billing API lane has not supplied live
            account limits yet.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-gray-300">
            {planDetails.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Usage & limits</h2>
            <p className="mt-1 text-sm text-gray-400">
              Usage comes from existing OpenDocs project and assistant endpoints
              when available.
            </p>
          </div>
          {loadingState && (
            <span className="inline-flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Loading usage
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <UsageCard
            label="Docs projects"
            used={resolvedUsage.projectsUsed}
            limit={resolvedUsage.projectLimit}
            fallback="Project usage is not available yet."
            noun="projects"
          />
          <UsageCard
            label="Assistant messages"
            used={resolvedUsage.assistantMessagesUsed}
            limit={resolvedUsage.assistantMessageLimit}
            fallback="Assistant usage is not available yet."
            noun="messages"
          />
        </div>
      </section>
    </div>
  );
}

function BillingButton({
  children,
  disabled,
  loading,
  onClick,
  testId,
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  testId: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "border border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]",
      )}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <CreditCard size={15} />
      )}
      {children}
      {!loading && <ArrowUpRight size={14} />}
    </button>
  );
}

function UsageCard({
  fallback,
  label,
  limit,
  noun,
  used,
}: {
  fallback: string;
  label: string;
  limit: number | null;
  noun: string;
  used: number | null;
}) {
  const percent = calculateBillingUsagePercent(used, limit);
  const hasUsage = used !== null;

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-white">{label}</h3>
          <p className="mt-1 text-xs text-gray-500">
            {formatBillingLimit(limit, noun)} included
          </p>
        </div>
        <span className="text-sm font-semibold text-white">
          {hasUsage ? used.toLocaleString() : "—"}
        </span>
      </div>
      {percent === null ? (
        <p className="mt-4 text-sm text-gray-400">{fallback}</p>
      ) : (
        <>
          <div className="mt-4 h-2 rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">{percent}% used</p>
        </>
      )}
    </div>
  );
}
