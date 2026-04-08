import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Database, Json } from "@/integrations/supabase/types";

export function useAuditLog() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const log = async (
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Json
  ) => {
    if (!user || !currentWorkspace) return;
    const payload: Database["public"]["Tables"]["audit_log"]["Insert"] = {
      workspace_id: currentWorkspace.id,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
    };
    await supabase.from("audit_log").insert(payload);
  };

  return { log };
}
