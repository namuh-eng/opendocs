export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultTrigger: string;
  defaultPrompt: string;
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "changelog",
    name: "Changelog",
    description:
      "Generate changelog entries from merged PRs and commit messages",
    icon: "clipboard-list",
    defaultTrigger: "on_merge",
    defaultPrompt:
      "Generate a changelog entry summarizing the changes in this PR.",
  },
  {
    id: "api-docs-sync",
    name: "API docs sync",
    description:
      "Update API reference when OpenAPI spec or source code changes",
    icon: "refresh-cw",
    defaultTrigger: "on_file_change",
    defaultPrompt:
      "Sync the API documentation to match the latest OpenAPI spec changes.",
  },
  {
    id: "draft-feature-docs",
    name: "Draft feature docs",
    description: "Draft documentation for new features when code ships",
    icon: "file-text",
    defaultTrigger: "on_merge",
    defaultPrompt:
      "Draft documentation for the new feature introduced in this PR.",
  },
  {
    id: "translations",
    name: "Translations",
    description:
      "Translate documentation into other languages when content changes",
    icon: "globe",
    defaultTrigger: "on_file_change",
    defaultPrompt:
      "Translate the updated documentation pages into the configured languages.",
  },
  {
    id: "enforce-style-guide",
    name: "Enforce style guide",
    description: "Use this to enforce consistent writing style and tone",
    icon: "shield",
    defaultTrigger: "on_commit",
    defaultPrompt:
      "Review the documentation changes and enforce the project style guide.",
  },
  {
    id: "typo-check",
    name: "Typo check",
    description: "Scan docs for spelling errors and broken formatting",
    icon: "type",
    defaultTrigger: "on_commit",
    defaultPrompt:
      "Scan the documentation for spelling errors and formatting issues.",
  },
  {
    id: "broken-link-detection",
    name: "Broken link detection",
    description: "Find and flag broken links across documentation",
    icon: "link",
    defaultTrigger: "on_schedule",
    defaultPrompt:
      "Scan all documentation pages for broken links and report any issues found.",
  },
  {
    id: "seo-metadata-audit",
    name: "SEO & metadata audit",
    description: "Check and fix page titles, descriptions, and OG metadata",
    icon: "search",
    defaultTrigger: "on_schedule",
    defaultPrompt:
      "Audit all documentation pages for SEO issues including titles, descriptions, and OG metadata.",
  },
  {
    id: "custom",
    name: "Custom workflow",
    description: "Build a workflow from scratch with your own configuration",
    icon: "zap",
    defaultTrigger: "on_commit",
    defaultPrompt: "",
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
