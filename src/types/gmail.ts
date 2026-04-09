import type { Json } from "@/integrations/supabase/types";

export interface GmailConnection {
  id: string;
  workspace_id: string;
  user_id: string;
  email_address: string;
  connected_at: string;
  last_sync_at: string | null;
  last_history_id: string | null;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
}

export type GmailSyncStatus = "up_to_date" | "imported" | "completed_with_issues";

export interface GmailSyncResult {
  success: boolean;
  status: GmailSyncStatus;
  imported: number;
  skipped: number;
  errors: number;
  attributed: number;
  needs_review: number;
  total: number;
  sync_mode: "incremental" | "full";
  synced_at: string;
  message: string;
}

export interface NewsletterInboxItem {
  id: string;
  workspace_id: string;
  gmail_connection_id: string | null;
  gmail_message_id: string | null;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  html_content: string | null;
  text_content: string | null;
  received_at: string | null;
  is_newsletter: boolean;
  newsletter_score: number | null;
  classification_method: string | null;
  competitor_id: string | null;
  is_read: boolean;
  is_archived: boolean;
  is_starred: boolean;
  tags: string[];
  headers_json: Record<string, string>;
  is_demo: boolean;
  imported_at: string;
  created_at: string;
}

export interface NewsletterExtraction {
  id: string;
  workspace_id: string;
  newsletter_inbox_id: string;
  campaign_type: string | null;
  main_message: string | null;
  offers: { description: string; type: string; value?: string }[];
  discount_percentage: number | null;
  coupon_code: string | null;
  free_shipping: boolean;
  expiry_date: string | null;
  calls_to_action: { text: string; url?: string; urgency?: string }[];
  urgency_signals: { signal: string; type: string }[];
  product_categories: string[];
  event_mentions: { event: string; date?: string; type: string }[];
  strategy_takeaways: { insight: string; category: string; confidence: number }[];
  confidence_scores: Record<string, number>;
  overall_confidence: number | null;
  model_used: string | null;
  extraction_method: string | null;
  is_valid: boolean;
  raw_extraction: Json;
  extracted_at: string;
  created_at: string;
}
