import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError, assertWorkspaceMember, requireAuthenticatedUser } from "../_shared/auth.ts";
import { fetchCompetitorIntelligenceSnapshots } from "../_shared/competitor-intelligence.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const { user } = await requireAuthenticatedUser(supabase, req);

    let workspaceId: string | null = null;
    let windowDays = 180;

    try {
      const body = await req.json();
      workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : null;
      windowDays = typeof body?.windowDays === "number" && body.windowDays > 0 ? Math.min(body.windowDays, 365) : 180;
    } catch {
      throw new HttpError(400, "Invalid request body.");
    }

    if (!workspaceId) {
      throw new HttpError(400, "workspaceId is required.");
    }

    await assertWorkspaceMember(supabase, user.id, workspaceId);

    const snapshots = await fetchCompetitorIntelligenceSnapshots(supabase, workspaceId, windowDays);

    return jsonResponse({
      workspaceId,
      generatedAt: new Date().toISOString(),
      competitors: snapshots,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }

    console.error("[competitor-intelligence] unhandled error", error);
    return jsonResponse({ error: message }, 500);
  }
});
