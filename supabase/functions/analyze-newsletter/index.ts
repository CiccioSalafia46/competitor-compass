import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  HttpError,
  assertVerifiedUser,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { assertActiveSubscription } from "../_shared/billing.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import { processNewsletterAnalysisJob } from "../_shared/newsletter-analysis.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user } = await requireAuthenticatedUser(supabase, req);
    await assertVerifiedUser(user);

    const body = await req.json();
    const analysisId = typeof body?.analysisId === "string" ? body.analysisId : "";
    const newsletterEntryId = typeof body?.newsletterEntryId === "string" ? body.newsletterEntryId : "";
    const SUPPORTED_LANGUAGES = ["en", "it", "de", "fr", "es"] as const;
    const requestedLang = typeof body?.language === "string" ? body.language : "en";
    const language = (SUPPORTED_LANGUAGES as readonly string[]).includes(requestedLang) ? requestedLang : "en";

    if (!analysisId || !newsletterEntryId) {
      return jsonResponse({ error: "analysisId and newsletterEntryId are required" }, 400);
    }

    const { data: analysisRow } = await supabase
      .from("analyses")
      .select("workspace_id")
      .eq("id", analysisId)
      .single<{ workspace_id: string }>();

    const workspaceId = analysisRow?.workspace_id;

    if (!workspaceId) {
      return jsonResponse({ error: "Analysis not found" }, 404);
    }

    await assertWorkspaceAnalyst(supabase, user.id, workspaceId);
    await assertActiveSubscription(supabase, workspaceId);

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: user.id,
      _workspace_id: workspaceId,
      _endpoint: "analyze-newsletter",
      _max_per_hour: 50,
    });

    if (!allowed) {
      return jsonResponse(
        { error: "Rate limit reached. You can analyze up to 50 newsletters per hour." },
        429,
      );
    }

    await processNewsletterAnalysisJob(supabase, { analysisId, newsletterEntryId, language });

    return jsonResponse({ success: true, analysisId, status: "completed" });
  } catch (error) {
    console.error("Analysis error:", error);

    if (error instanceof HttpError) {
      return jsonResponse({ error: getErrorMessage(error) }, error.status);
    }

    return jsonResponse({ error: "An internal error occurred. Please try again." }, 500);
  }
});
