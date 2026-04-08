"use client";

import { getTemplateById } from "@/lib/workflow-templates";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function NewWorkflowClient({
  templateId,
}: {
  templateId: string | undefined;
}) {
  const template = templateId ? getTemplateById(templateId) : undefined;
  const name = template?.name ?? "";
  const prompt = template?.defaultPrompt ?? "";
  const trigger = template?.defaultTrigger ?? "on_commit";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/products/workflows"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to templates
      </Link>

      <h1 className="mb-8 text-2xl font-semibold text-white">
        {template ? `New workflow: ${template.name}` : "New custom workflow"}
      </h1>

      <form className="space-y-6">
        <div>
          <label
            htmlFor="workflow-name"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            Name
          </label>
          <input
            id="workflow-name"
            type="text"
            defaultValue={name}
            placeholder="My workflow"
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label
            htmlFor="workflow-trigger"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            Trigger
          </label>
          <select
            id="workflow-trigger"
            defaultValue={trigger}
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="on_commit">On commit</option>
            <option value="on_merge">On merge</option>
            <option value="on_file_change">On file change</option>
            <option value="on_schedule">On schedule</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="workflow-prompt"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            Prompt
          </label>
          <textarea
            id="workflow-prompt"
            rows={4}
            defaultValue={prompt}
            placeholder="Describe what this workflow should do..."
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          type="button"
          disabled
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          Create workflow
        </button>
        <p className="text-xs text-gray-500">
          Workflow creation will be available in a future update.
        </p>
      </form>
    </div>
  );
}
