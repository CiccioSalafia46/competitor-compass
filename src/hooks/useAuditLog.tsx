import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

export function useAuditLog() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const log = async (
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user || !currentWorkspace) return;
    await supabase.from("audit_log").insert({
      workspace_id: currentWorkspace.id,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
    } as any);
  };

  return { log };
}
