"use client";

import { workflowTemplates } from "@/lib/workflow-templates";
import {
  ClipboardList,
  FileText,
  Globe,
  Link,
  RefreshCw,
  Search,
  Shield,
  Type,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const iconMap: Record<string, ReactNode> = {
  "clipboard-list": <ClipboardList size={20} className="text-gray-400" />,
  "refresh-cw": <RefreshCw size={20} className="text-gray-400" />,
  "file-text": <FileText size={20} className="text-gray-400" />,
  globe: <Globe size={20} className="text-gray-400" />,
  shield: <Shield size={20} className="text-gray-400" />,
  type: <Type size={20} className="text-gray-400" />,
  link: <Link size={20} className="text-gray-400" />,
  search: <Search size={20} className="text-gray-400" />,
  zap: <Zap size={20} className="text-gray-400" />,
};

export function WorkflowsPageClient() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
        <span>Agents</span>
        <span>/</span>
        <span>Workflows</span>
        <span>/</span>
        <span className="text-white">New workflow</span>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-white">
          What do you want to automate?
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Pick a workflow template to get started, or build a custom one from
          scratch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {workflowTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() =>
              router.push(`/products/workflows/new?template=${template.id}`)
            }
            className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-left transition-colors hover:border-gray-700 hover:bg-gray-800/60"
            data-testid={`template-card-${template.id}`}
          >
            <div className="mt-0.5 shrink-0">{iconMap[template.icon]}</div>
            <div>
              <div className="font-medium text-white">{template.name}</div>
              <div className="mt-0.5 text-sm text-gray-400">
                {template.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
