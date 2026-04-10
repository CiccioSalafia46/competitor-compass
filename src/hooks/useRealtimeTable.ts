import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseRealtimeTableOptions {
  /** Unique Supabase Realtime channel name. Include a resource ID to avoid collisions. */
  channelName: string;
  /** Postgres table to subscribe to. */
  table: string;
  /** Optional Postgres filter expression, e.g. `workspace_id=eq.${id}`. */
  filter?: string;
  /** Subscription is only established when true (default: true). */
  enabled?: boolean;
  /**
   * Called on any INSERT, UPDATE, or DELETE event.
   * Does not need to be wrapped in useCallback — it is held in a ref internally.
   */
  onEvent: () => void;
}

/**
 * Subscribes to all Postgres changes on a Supabase table via Realtime.
 *
 * The channel is torn down and recreated only when channelName, table, filter,
 * or enabled changes — not when the onEvent callback changes identity.
 */
export function useRealtimeTable({
  channelName,
  table,
  filter,
  enabled = true,
  onEvent,
}: UseRealtimeTableOptions): void {
  // Hold the latest callback in a ref so subscription deps stay stable
  // even when the caller's closure updates between renders.
  const callbackRef = useRef(onEvent);
  useEffect(() => {
    callbackRef.current = onEvent;
  });

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => callbackRef.current(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // onEvent intentionally omitted — managed via ref above.
  }, [channelName, table, filter, enabled]);
}
