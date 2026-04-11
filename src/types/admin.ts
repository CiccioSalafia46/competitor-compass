// ─── Core user & workspace types ─────────────────────────────────────────────

export type AdminRoleAssignment = {
  role: string;
  workspace_id: string;
};

export type AdminUserWorkspace = {
  workspace_id: string;
  name: string;
  role: string;
};

export type AdminUserRecord = {
  id: string;
  email: string | null;
  display_name: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  banned: boolean;
  roles: AdminRoleAssignment[];
  workspaces: AdminUserWorkspace[];
};

export type AdminUsersResponse = {
  users: AdminUserRecord[];
  total: number;
  page: number;
  perPage: number;
};

export type AdminWorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_id: string | null;
  owner_display_name: string | null;
  memberCount: number;
  competitorCount: number;
  newsletterCount: number;
  insightCount: number;
  analysisCount?: number;
  plan?: string | null;
  stripeStatus?: string | null;
};

export type AdminWorkspacesResponse = {
  workspaces: AdminWorkspaceRecord[];
};

// ─── Audit log types ──────────────────────────────────────────────────────────

export type AdminLogEntry = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type AdminLogsResponse = {
  logs: AdminLogEntry[];
  total: number;
};

// ─── Gmail / integration types ────────────────────────────────────────────────

export type AdminGmailConnection = {
  id: string;
  email_address: string;
  sync_status: string;
  sync_error: string | null;
  last_sync_at: string | null;
  connected_at: string;
  workspace_id?: string | null;
};

export type AdminIntegrationsResponse = {
  gmailConnections: AdminGmailConnection[];
  rateLimitsByEndpoint: Record<string, number>;
};

// ─── Issues types ─────────────────────────────────────────────────────────────

export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueCategory =
  | "gmail_sync"
  | "analysis_failure"
  | "rate_limit"
  | "token_expired"
  | "webhook"
  | "billing"
  | "other";

export type AdminIssueRecord = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string | null;
  entity_type: string;
  entity_id: string;
  workspace_id: string | null;
  created_at: string;
  last_seen_at: string | null;
  resolved: boolean;
  retry_count?: number;
};

export type AdminAnalysisIssue = {
  id: string;
  analysis_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  workspace_id: string | null;
};

export type AdminIssuesResponse = {
  syncErrors: AdminGmailConnection[];
  failedAnalyses: AdminAnalysisIssue[];
};

// ─── Secrets / config types ───────────────────────────────────────────────────

export type AdminSecretEntry = {
  name: string;
  configured: boolean;
  masked: string;
};

export type AdminIntegrationHealthItem = {
  id: string;
  name: string;
  category: string;
  envStatus: string;
  productionReady: boolean;
  secrets: AdminSecretEntry[];
  health: Record<string, string | number | boolean>;
  notes?: string | null;
};

export type AdminIntegrationTestResult = {
  test: string;
  status: string;
  message: string;
};

export type AdminFeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
  description?: string | null;
  category: string;
};

export type AdminSecretsResponse = {
  integrations: AdminIntegrationHealthItem[];
  flags: AdminFeatureFlag[];
};

// ─── Dashboard / overview types ───────────────────────────────────────────────

export type AdminSignupTrendPoint = {
  day: string;
  count: number;
};

export type AdminOverviewActivity = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type AdminOverviewSyncError = {
  id: string;
  email_address: string;
  sync_status: string;
  sync_error: string | null;
  last_sync_at: string | null;
  workspace_id: string | null;
};

export type AdminOverviewData = {
  // Core platform counts
  totalUsers: number;
  totalWorkspaces: number;
  gmailConnections: number;
  totalNewsletters: number;
  totalInsights: number;
  totalCompetitors: number;
  totalAnalyses: number;
  totalMetaAds: number;
  rateLimitHits: number;
  // Enhanced metrics
  recentSignups: number;
  newUsersToday: number;
  activeWorkspaces: number;
  failedAnalysesCount: number;
  // Activity & issues
  recentActivity: AdminOverviewActivity[];
  syncErrors: AdminOverviewSyncError[];
  // Trend data
  signupTrend: AdminSignupTrendPoint[];
};

// ─── Billing types ────────────────────────────────────────────────────────────

export type AdminWorkspaceBilling = {
  workspace_id: string;
  workspace_name: string;
  member_count: number;
  stripe_status: string | null;
  plan_key: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export type AdminBillingResponse = {
  subscriptions: AdminWorkspaceBilling[];
  tierCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalPaid: number;
};

// ─── System health types ──────────────────────────────────────────────────────

export type AdminHealthCheck = {
  name: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  message: string;
  value?: number | string | null;
};

export type AdminSystemHealthResponse = {
  overallScore: number;
  checks: AdminHealthCheck[];
  gmailHealthPct: number;
  analysisSuccessRate: number;
  recentErrorCount: number;
  expiredTokenCount: number;
};
