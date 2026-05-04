import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function MintlifyWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
