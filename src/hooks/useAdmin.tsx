import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useAdminCheck() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // Check if user has admin role in ANY workspace — sufficient for platform admin
        const { data } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .limit(1);
        setIsAdmin((data?.length ?? 0) > 0);
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
      }
      setLoading(false);
    })();
  }, [user]);

  return { isAdmin, loading };
}

export function useAdminData(action: string, extraBody?: Record<string, any>) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase.functions.invoke("admin-data", {
        body: { action, ...extraBody },
      });
      if (err) throw err;
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [action, JSON.stringify(extraBody)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useAdminAction() {
  const [acting, setActing] = useState(false);

  const execute = useCallback(async (action: string, body: Record<string, any> = {}) => {
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action, ...body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (e: any) {
      toast.error(e.message || "Action failed");
      throw e;
    } finally {
      setActing(false);
    }
  }, []);

  return { execute, acting };
}
