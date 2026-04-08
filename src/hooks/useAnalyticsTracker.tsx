import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Database, Json } from "@/integrations/supabase/types";

/**
 * Lightweight internal analytics tracker.
 * Logs product events to usage_events for internal metrics.
 * No external dependencies, no PII.
 */
export function useAnalyticsTracker() {
  const { currentWorkspace } = useWorkspace();

  const track = useCallback(
    async (event: string, metadata?: Json) => {
      if (!currentWorkspace) return;
      try {
        const payload: Database["public"]["Tables"]["usage_events"]["Insert"] = {
          workspace_id: currentWorkspace.id,
          event_type: event,
          quantity: 1,
          metadata: metadata || {},
        };
        await supabase.from("usage_events").insert(payload);
      } catch {
        // Silent fail — analytics should never break UX
      }
    },
    [currentWorkspace]
  );

  return { track };
}

// Standard event names for consistency
export const ANALYTICS_EVENTS = {
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  GMAIL_CONNECTED: "gmail_connected",
  COMPETITOR_ADDED: "competitor_added",
  NEWSLETTER_IMPORTED: "newsletter_imported",
  FIRST_INSIGHT_VIEWED: "first_insight_viewed",
  INSIGHT_GENERATED: "insight_generated",
  UPGRADE_CLICKED: "upgrade_clicked",
  UPGRADE_PROMPT_SHOWN: "upgrade_prompt_shown",
  ALERT_RULE_CREATED: "alert_rule_created",
  META_AD_ANALYZED: "meta_ad_analyzed",
} as const;
