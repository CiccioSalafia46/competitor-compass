import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { getErrorMessage } from "@/lib/errors";

export function useAdminCheck() {
  const { user, session, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || (userId && !accessToken)) {
      setLoading(true);
      return;
    }

    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const result = await invokeEdgeFunction<{ isPlatformAdmin?: boolean }>("admin-data", {
          body: { action: "auth_status" },
        });
        if (!cancelled) {
          setIsAdmin(Boolean(result?.isPlatformAdmin));
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading, userId]);

  return { isAdmin, loading };
}

export function useAdminData<T>(action: string, extraBody?: Record<string, unknown>) {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const extraBodyKey = JSON.stringify(extraBody ?? {});

  const fetch = useCallback(async () => {
    if (authLoading || !accessToken) {
      setLoading(Boolean(authLoading));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await invokeEdgeFunction<T & { error?: string }>("admin-data", {
        body: { action, ...(JSON.parse(extraBodyKey) as Record<string, unknown>) },
      });
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to load"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, action, authLoading, extraBodyKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useAdminAction() {
  const [acting, setActing] = useState(false);

  const execute = useCallback(async <T,>(action: string, body: Record<string, unknown> = {}) => {
    setActing(true);
    try {
      const data = await invokeEdgeFunction<T & { error?: string }>("admin-data", {
        body: { action, ...body },
      });
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (error) {
      toast.error(getErrorMessage(error, "Action failed"));
      throw error;
    } finally {
      setActing(false);
    }
  }, []);

  return { execute, acting };
}
