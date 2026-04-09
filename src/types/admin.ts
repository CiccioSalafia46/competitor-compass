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
  owner_display_name: string | null;
  memberCount: number;
  competitorCount: number;
  newsletterCount: number;
  insightCount: number;
};

export type AdminWorkspacesResponse = {
  workspaces: AdminWorkspaceRecord[];
};

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
