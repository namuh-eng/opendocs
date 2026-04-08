import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
