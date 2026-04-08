import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function EditorLayout({
  children,
}: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
