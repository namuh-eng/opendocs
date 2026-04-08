import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkflowsPageClient } from "./workflows-page-client";

export default async function WorkflowsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <WorkflowsPageClient />;
}
