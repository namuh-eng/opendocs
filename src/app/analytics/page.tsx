import { Suspense } from "react";
import { AnalyticsShell } from "./analytics-shell";

function AnalyticsContent() {
  return (
    <div className="text-gray-500 text-sm">
      <p>Select a date range and traffic source to view analytics.</p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6">
          <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
        </div>
      }
    >
      <AnalyticsShell>
        <AnalyticsContent />
      </AnalyticsShell>
    </Suspense>
  );
}
