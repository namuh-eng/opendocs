import { BarChart3 } from "lucide-react";
import Link from "next/link";

export function AnalyticsEmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      data-testid="analytics-empty-state"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <BarChart3 size={32} className="text-emerald-500" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-white">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          data-testid="analytics-empty-state-cta"
        >
          {ctaLabel}
        </Link>
      ) : (
        <span className="text-sm font-medium text-emerald-500">{ctaLabel}</span>
      )}
    </div>
  );
}
