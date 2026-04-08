import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const orgPlanEnum = pgEnum("org_plan", ["free", "pro", "enterprise"]);
export const orgRoleEnum = pgEnum("org_role", ["admin", "editor", "viewer"]);
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "deploying",
  "error",
]);
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "queued",
  "in_progress",
  "succeeded",
  "failed",
]);
export const apiKeyTypeEnum = pgEnum("api_key_type", ["admin", "assistant"]);
export const agentJobStatusEnum = pgEnum("agent_job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);
export const deploymentTypeEnum = pgEnum("deployment_type", [
  "production",
  "preview",
]);
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "view",
  "search",
  "feedback",
]);

// ── Organizations ──────────────────────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    name: t.varchar({ length: 256 }).notNull(),
    slug: t.varchar({ length: 256 }).notNull(),
    plan: orgPlanEnum().default("free").notNull(),
    settings: t.jsonb().$type<Record<string, unknown>>().default({}),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.uniqueIndex("org_slug_idx").on(table.slug)],
);

// ── Org Memberships ────────────────────────────────────────────────────────────

export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: t.text("user_id").notNull(),
    role: orgRoleEnum().default("viewer").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("membership_org_idx").on(table.orgId),
    t.index("membership_user_idx").on(table.userId),
    t.uniqueIndex("membership_org_user_idx").on(table.orgId, table.userId),
  ],
);

// ── Projects ───────────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 256 }).notNull(),
    slug: t.varchar({ length: 256 }).notNull(),
    repoUrl: t.text("repo_url"),
    repoBranch: t.varchar("repo_branch", { length: 256 }).default("main"),
    repoPath: t.varchar("repo_path", { length: 512 }).default("/"),
    customDomain: t.varchar("custom_domain", { length: 256 }),
    subdomain: t.varchar({ length: 256 }),
    settings: t.jsonb().$type<Record<string, unknown>>().default({}),
    status: projectStatusEnum().default("active").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("project_org_idx").on(table.orgId),
    t.uniqueIndex("project_org_slug_idx").on(table.orgId, table.slug),
  ],
);

// ── Deployments ────────────────────────────────────────────────────────────────

export const deployments = pgTable(
  "deployments",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: deploymentTypeEnum().default("production").notNull(),
    status: deploymentStatusEnum().default("queued").notNull(),
    branch: t.varchar({ length: 256 }),
    previewUrl: t.varchar("preview_url", { length: 512 }),
    commitSha: t.varchar("commit_sha", { length: 40 }),
    commitMessage: t.text("commit_message"),
    startedAt: t.timestamp("started_at", { withTimezone: true }),
    endedAt: t.timestamp("ended_at", { withTimezone: true }),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.index("deployment_project_idx").on(table.projectId)],
);

// ── Pages ──────────────────────────────────────────────────────────────────────

export const pages = pgTable(
  "pages",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: t.varchar({ length: 512 }).notNull(),
    title: t.varchar({ length: 512 }).notNull(),
    description: t.text(),
    content: t.text().default(""),
    frontmatter: t.jsonb().$type<Record<string, unknown>>().default({}),
    isPublished: t.boolean("is_published").default(false).notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("page_project_idx").on(table.projectId),
    t.uniqueIndex("page_project_path_idx").on(table.projectId, table.path),
  ],
);

// ── API Keys ───────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 256 }).notNull(),
    keyPrefix: t.varchar("key_prefix", { length: 20 }).notNull(),
    keyHash: t.text("key_hash").notNull(),
    type: apiKeyTypeEnum().default("admin").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: t.timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    t.index("api_key_org_idx").on(table.orgId),
    t.index("api_key_prefix_idx").on(table.keyPrefix),
  ],
);

// ── Agent Jobs ─────────────────────────────────────────────────────────────────

export const agentJobs = pgTable(
  "agent_jobs",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    prompt: t.text().notNull(),
    status: agentJobStatusEnum().default("pending").notNull(),
    prUrl: t.text("pr_url"),
    messages: t
      .json()
      .$type<{ role: "user" | "agent"; content: string; timestamp: string }[]>()
      .default([])
      .notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.index("agent_job_project_idx").on(table.projectId)],
);

// ── Assistant Conversations ────────────────────────────────────────────────────

export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    messages: t
      .jsonb()
      .$type<Array<{ role: string; content: string }>>()
      .default([]),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.index("conversation_project_idx").on(table.projectId)],
);

// ── Analytics Events ───────────────────────────────────────────────────────────

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    pageId: t
      .uuid("page_id")
      .references(() => pages.id, { onDelete: "set null" }),
    type: analyticsEventTypeEnum().notNull(),
    data: t.jsonb().$type<Record<string, unknown>>().default({}),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("analytics_project_idx").on(table.projectId),
    t.index("analytics_type_idx").on(table.type),
    t.index("analytics_created_idx").on(table.createdAt),
  ],
);

// ── Agent Settings ────────────────────────────────────────────────────────────

export const agentSettings = pgTable(
  "agent_settings",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentEnabled: t.boolean("agent_enabled").default(false).notNull(),
    slackConnected: t.boolean("slack_connected").default(false).notNull(),
    slackWorkspace: t.varchar("slack_workspace", { length: 256 }),
    githubAppInstalled: t
      .boolean("github_app_installed")
      .default(false)
      .notNull(),
    connectedRepos: t
      .jsonb("connected_repos")
      .$type<
        Array<{
          org: string;
          repo: string;
          branch: string;
          permissions: string;
        }>
      >()
      .default([]),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.uniqueIndex("agent_settings_org_idx").on(table.orgId)],
);

// ── Assistant Settings ────────────────────────────────────────────────────────

export const assistantSettings = pgTable(
  "assistant_settings",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    enabled: t.boolean().default(false).notNull(),
    deflectionEnabled: t.boolean("deflection_enabled").default(false).notNull(),
    deflectionEmail: t.varchar("deflection_email", { length: 256 }),
    showHelpButton: t.boolean("show_help_button").default(false).notNull(),
    searchDomainsEnabled: t
      .boolean("search_domains_enabled")
      .default(false)
      .notNull(),
    searchDomains: t.jsonb("search_domains").$type<string[]>().default([]),
    starterQuestionsEnabled: t
      .boolean("starter_questions_enabled")
      .default(false)
      .notNull(),
    starterQuestions: t
      .jsonb("starter_questions")
      .$type<string[]>()
      .default([]),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.uniqueIndex("assistant_settings_project_idx").on(table.projectId),
  ],
);

// ── Assistant Usage ──────────────────────────────────────────────────────────

export const assistantUsage = pgTable(
  "assistant_usage",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    messagesUsed: t.integer("messages_used").default(0).notNull(),
    messageLimit: t.integer("message_limit").default(250).notNull(),
    billingCycleStart: t.timestamp("billing_cycle_start", {
      withTimezone: true,
    }),
    billingCycleEnd: t.timestamp("billing_cycle_end", { withTimezone: true }),
    monthlyPrice: t.integer("monthly_price").default(0).notNull(),
    overageSpend: t.integer("overage_spend").default(0).notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.uniqueIndex("assistant_usage_project_idx").on(table.projectId)],
);

// ── Workflow Trigger Type ─────────────────────────────────────────────────────

export const workflowTriggerTypeEnum = pgEnum("workflow_trigger_type", [
  "on_pr_merge",
  "on_schedule",
]);

// ── Workflows ─────────────────────────────────────────────────────────────────

export const workflows = pgTable(
  "workflows",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 256 }).notNull(),
    triggerType: workflowTriggerTypeEnum("trigger_type").notNull(),
    triggerConfig: t
      .jsonb("trigger_config")
      .$type<{
        repos?: string[];
        frequency?: "daily" | "weekly" | "monthly" | "custom";
        time?: string;
        customCron?: string;
      }>()
      .default({}),
    prompt: t.text().notNull(),
    autoMerge: t.boolean("auto_merge").default(true).notNull(),
    contextRepos: t.jsonb("context_repos").$type<string[]>().default([]),
    slackNotify: t.boolean("slack_notify").default(false).notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.index("workflow_project_idx").on(table.projectId)],
);

// ── GitHub Connections ────────────────────────────────────────────────────────

export const githubConnections = pgTable(
  "github_connections",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    installationId: t.varchar("installation_id", { length: 64 }).notNull(),
    repos: t
      .jsonb()
      .$type<
        Array<{
          fullName: string;
          branch: string;
          permissions: string;
        }>
      >()
      .default([]),
    autoUpdateEnabled: t.boolean("auto_update_enabled").default(true).notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("github_conn_org_idx").on(table.orgId),
    t.uniqueIndex("github_conn_installation_idx").on(table.installationId),
  ],
);

// ── Audit Logs ─────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: t.text("user_id"),
    action: t.varchar({ length: 256 }).notNull(),
    details: t.jsonb().$type<Record<string, unknown>>().default({}),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("audit_org_idx").on(table.orgId),
    t.index("audit_created_idx").on(table.createdAt),
  ],
);

// ── User Preferences ──────────────────────────────────────────────────────────

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    userId: t.text("user_id").notNull().unique(),
    emailNotifications: t
      .boolean("email_notifications")
      .default(true)
      .notNull(),
    githubAuthorized: t.boolean("github_authorized").default(false).notNull(),
    githubUsername: t.varchar("github_username", { length: 256 }),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.uniqueIndex("user_prefs_user_idx").on(table.userId)],
);

// ── Suggestion Status ─────────────────────────────────────────────────────────

export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "pending",
  "accepted",
  "rejected",
]);

// ── Comments ──────────────────────────────────────────────────────────────────

export const comments = pgTable(
  "comments",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    pageId: t
      .uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    userId: t.text("user_id").notNull(),
    parentId: t.uuid("parent_id"),
    content: t.text().notNull(),
    resolved: t.boolean().default(false).notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("comment_page_idx").on(table.pageId),
    t.index("comment_user_idx").on(table.userId),
    t.index("comment_parent_idx").on(table.parentId),
  ],
);

// ── Suggestions ───────────────────────────────────────────────────────────────

export const suggestions = pgTable(
  "suggestions",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    pageId: t
      .uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    userId: t.text("user_id").notNull(),
    diff: t.text().notNull(),
    status: suggestionStatusEnum().default("pending").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("suggestion_page_idx").on(table.pageId),
    t.index("suggestion_user_idx").on(table.userId),
    t.index("suggestion_status_idx").on(table.status),
  ],
);

// ── Branches ──────────────────────────────────────────────────────────────────

export const branches = pgTable(
  "branches",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 256 }).notNull(),
    isDefault: t.boolean("is_default").default(false).notNull(),
    createdBy: t.text("created_by"),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("branch_project_idx").on(table.projectId),
    t.uniqueIndex("branch_project_name_idx").on(table.projectId, table.name),
  ],
);
