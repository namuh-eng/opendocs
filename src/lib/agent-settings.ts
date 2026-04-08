/**
 * Agent settings utilities — types, validation, defaults.
 */

export interface ConnectedRepo {
  org: string;
  repo: string;
  branch: string;
  permissions: string;
}

export interface AgentSettingsData {
  agentEnabled: boolean;
  slackConnected: boolean;
  slackWorkspace: string | null;
  githubAppInstalled: boolean;
  connectedRepos: ConnectedRepo[];
}

export const DEFAULT_AGENT_SETTINGS: AgentSettingsData = {
  agentEnabled: false,
  slackConnected: false,
  slackWorkspace: null,
  githubAppInstalled: false,
  connectedRepos: [],
};

/** Check whether an org plan supports the agent feature. */
export function planSupportsAgent(plan: string): boolean {
  return plan === "pro" || plan === "enterprise";
}

/** Format a repo display string like "org/repo". */
export function formatRepoName(repo: ConnectedRepo): string {
  return `${repo.org}/${repo.repo}`;
}

/** Validate connected repos JSON shape. */
export function validateConnectedRepos(data: unknown): data is ConnectedRepo[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof item.org === "string" &&
      typeof item.repo === "string" &&
      typeof item.branch === "string" &&
      typeof item.permissions === "string",
  );
}

/** Validate an update request body for agent settings. */
export function validateAgentSettingsUpdate(
  body: unknown,
):
  | { valid: true; data: Partial<AgentSettingsData> }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const b = body as Record<string, unknown>;
  const data: Partial<AgentSettingsData> = {};

  if ("agentEnabled" in b) {
    if (typeof b.agentEnabled !== "boolean") {
      return { valid: false, error: "agentEnabled must be a boolean" };
    }
    data.agentEnabled = b.agentEnabled;
  }

  if ("slackConnected" in b) {
    if (typeof b.slackConnected !== "boolean") {
      return { valid: false, error: "slackConnected must be a boolean" };
    }
    data.slackConnected = b.slackConnected;
  }

  if ("slackWorkspace" in b) {
    if (b.slackWorkspace !== null && typeof b.slackWorkspace !== "string") {
      return { valid: false, error: "slackWorkspace must be a string or null" };
    }
    data.slackWorkspace = b.slackWorkspace as string | null;
  }

  if ("githubAppInstalled" in b) {
    if (typeof b.githubAppInstalled !== "boolean") {
      return { valid: false, error: "githubAppInstalled must be a boolean" };
    }
    data.githubAppInstalled = b.githubAppInstalled;
  }

  if ("connectedRepos" in b) {
    if (!validateConnectedRepos(b.connectedRepos)) {
      return {
        valid: false,
        error:
          "connectedRepos must be an array of {org, repo, branch, permissions}",
      };
    }
    data.connectedRepos = b.connectedRepos;
  }

  if (Object.keys(data).length === 0) {
    return { valid: false, error: "No valid fields to update" };
  }

  return { valid: true, data };
}
