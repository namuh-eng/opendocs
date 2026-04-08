import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { NewWorkflowClient } from "./new-workflow-client";

export default async function NewWorkflowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const templateId =
    typeof params.template === "string" ? params.template : undefined;

  return <NewWorkflowClient templateId={templateId} />;
}
