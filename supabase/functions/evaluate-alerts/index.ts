import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { evaluateAlertRules } from "../_shared/alerts.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

const log = (step: string, details?: Record<string, unknown>) =>
  console.log(JSON.stringify({ fn: "evaluate-alerts", step, ts: new Date().toISOString(), ...(details || {}) }));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { user } = await requireAuthenticatedUser(supabase, req);
    const body = await req.json();
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
    const requestedSource = body?.source === "scheduled" ? "scheduled" : "manual";

    if (!workspaceId) {
      return jsonResponse({ error: "workspaceId required" }, 400);
    }

    await assertWorkspaceAnalyst(supabase, user.id, workspaceId);

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: user.id,
      _workspace_id: workspaceId,
      _endpoint: "evaluate-alerts",
      _max_per_hour: 5,
    });

    if (!allowed) {
      return jsonResponse({ error: "Rate limit reached. You can evaluate alerts up to 5 times per hour." }, 429);
    }

    log("evaluate", { workspaceId, source: requestedSource, requestedBy: user.id });

    const summary = await evaluateAlertRules(supabase, {
      workspaceId,
      source: requestedSource,
      triggeredBy: user.id,
    });

    log("done", summary);

    return jsonResponse({
      success: true,
      ...summary,
      message:
        summary.created > 0
          ? `Triggered ${summary.created} alert${summary.created === 1 ? "" : "s"}`
          : "Evaluation completed with no new alerts",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    log("error", { message });
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }
    return jsonResponse({ error: "An internal error occurred. Please try again." }, 500);
  }
});
