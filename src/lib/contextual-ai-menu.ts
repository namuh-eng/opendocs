/**
 * Contextual AI Menu — configuration and helpers for one-click buttons
 * that send doc page content to external AI tools.
 */

export type AiToolId =
  | "chatgpt"
  | "claude"
  | "cursor"
  | "perplexity"
  | "google-ai-studio"
  | "grok"
  | "devin"
  | "windsurf";

export interface AiTool {
  id: AiToolId;
  label: string;
  /** URL template — use {content} and {url} placeholders */
  urlTemplate: string;
}

export interface ContextualAiMenuConfig {
  enabled: boolean;
  tools: AiToolId[];
}

/** Maximum content length to include in URL (prevents extremely long URLs) */
const MAX_CONTENT_LENGTH = 4000;

export const AI_TOOLS: AiTool[] = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    urlTemplate: "https://chatgpt.com/?q={content}",
  },
  {
    id: "claude",
    label: "Claude",
    urlTemplate: "https://claude.ai/new?q={content}",
  },
  {
    id: "cursor",
    label: "Cursor",
    urlTemplate: "https://cursor.com",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    urlTemplate: "https://www.perplexity.ai/search?q={content}",
  },
  {
    id: "google-ai-studio",
    label: "Google AI Studio",
    urlTemplate: "https://aistudio.google.com/prompts/new_chat?q={content}",
  },
  {
    id: "grok",
    label: "Grok",
    urlTemplate: "https://grok.com/?q={content}",
  },
  {
    id: "devin",
    label: "Devin",
    urlTemplate: "https://app.devin.ai",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    urlTemplate: "https://windsurf.com",
  },
];

export const DEFAULT_CONTEXTUAL_AI_MENU: ContextualAiMenuConfig = {
  enabled: false,
  tools: [],
};

/** Returns the full AiTool objects for enabled tool IDs, in config order. */
export function getEnabledAiTools(config: ContextualAiMenuConfig): AiTool[] {
  if (!config.enabled) return [];
  return config.tools
    .map((id) => AI_TOOLS.find((t) => t.id === id))
    .filter((t): t is AiTool => t !== undefined);
}

/** Build the URL for an AI tool with page content substituted. */
export function buildAiToolUrl(
  toolId: AiToolId,
  content: string,
  pageUrl: string,
): string {
  const tool = AI_TOOLS.find((t) => t.id === toolId);
  if (!tool) return "";

  const truncated =
    content.length > MAX_CONTENT_LENGTH
      ? `${content.slice(0, MAX_CONTENT_LENGTH)}...`
      : content;

  const prompt = `Help me understand this documentation page:\n\n${truncated}\n\nSource: ${pageUrl}`;

  return tool.urlTemplate
    .replace("{content}", encodeURIComponent(prompt))
    .replace("{url}", encodeURIComponent(pageUrl));
}
