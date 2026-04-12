import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  HttpError,
  assertVerifiedUser,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import {
  buildNewsletterSourceSnapshot,
  processNewsletterAnalysisJob,
} from "../_shared/newsletter-analysis.ts";

type NewsletterEntryRow = {
  id: string;
  workspace_id: string;
  competitor_id: string | null;
  subject: string | null;
  content: string;
  sender_email: string | null;
  received_at: string | null;
  source: string;
  created_by: string;
};

type AnalysisRow = {
  id: string;
  newsletter_entry_id: string;
  workspace_id: string;
  status: string;
};

type EdgeRuntimeGlobal = typeof globalThis & {
  EdgeRuntime?: {
    waitUntil: (promise: Promise<unknown>) => void;
  };
};

function scheduleBackgroundTask(task: Promise<unknown>) {
  const edgeRuntime = globalThis as EdgeRuntimeGlobal;

  if (edgeRuntime.EdgeRuntime?.waitUntil) {
    edgeRuntime.EdgeRuntime.waitUntil(task);
    return;
  }

  void task.catch((error) => {
    console.error("[enqueue-newsletter-analysis] background task failed", error);
  });
}

async function processQueuedAnalyses(
  supabase: ReturnType<typeof createClient>,
  analyses: AnalysisRow[],
) {
  for (const analysis of analyses) {
    try {
      await processNewsletterAnalysisJob(supabase, {
        analysisId: analysis.id,
        newsletterEntryId: analysis.newsletter_entry_id,
      });
    } catch (error) {
      console.error("[enqueue-newsletter-analysis] analysis job failed", analysis.id, error);
    }
  }
}

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
    const newsletterEntryIds = Array.isArray(body?.newsletterEntryIds)
      ? body.newsletterEntryIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    if (!analysisId && newsletterEntryIds.length === 0) {
      return jsonResponse({ error: "analysisId or newsletterEntryIds is required" }, 400);
    }

    const queuedAnalyses: AnalysisRow[] = [];

    if (analysisId) {
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .select("id, newsletter_entry_id, workspace_id, status")
        .eq("id", analysisId)
        .single<AnalysisRow>();

      if (analysisError || !analysis) {
        return jsonResponse({ error: "Analysis not found" }, 404);
      }

      await assertWorkspaceAnalyst(supabase, user.id, analysis.workspace_id);

      const { data: entry, error: entryError } = await supabase
        .from("newsletter_entries")
        .select("id, workspace_id, competitor_id, subject, content, sender_email, received_at, source, created_by")
        .eq("id", analysis.newsletter_entry_id)
        .single<NewsletterEntryRow>();

      if (entryError || !entry) {
        return jsonResponse({ error: "Newsletter entry not found" }, 404);
      }

      await supabase
        .from("analyses")
        .update({
          status: "pending",
          requested_by: user.id,
          source_snapshot: buildNewsletterSourceSnapshot(entry),
          queued_at: new Date().toISOString(),
          processing_started_at: null,
          completed_at: null,
          error_message: null,
          validation_errors: null,
          attempt_count: 0,
        })
        .eq("id", analysis.id);

      queuedAnalyses.push({
        id: analysis.id,
        newsletter_entry_id: analysis.newsletter_entry_id,
        workspace_id: analysis.workspace_id,
        status: "pending",
      });
    }

    if (newsletterEntryIds.length > 0) {
      const uniqueEntryIds = Array.from(new Set(newsletterEntryIds));
      const { data: entries, error: entriesError } = await supabase
        .from("newsletter_entries")
        .select("id, workspace_id, competitor_id, subject, content, sender_email, received_at, source, created_by")
        .in("id", uniqueEntryIds)
        .returns<NewsletterEntryRow[]>();

      if (entriesError) {
        throw entriesError;
      }

      if (!entries || entries.length !== uniqueEntryIds.length) {
        return jsonResponse({ error: "One or more newsletter entries were not found" }, 404);
      }

      const workspaceIds = Array.from(new Set(entries.map((entry) => entry.workspace_id)));
      for (const workspaceId of workspaceIds) {
        await assertWorkspaceAnalyst(supabase, user.id, workspaceId);
      }

      const { data: insertedAnalyses, error: insertError } = await supabase
        .from("analyses")
        .insert(
          entries.map((entry) => ({
            workspace_id: entry.workspace_id,
            newsletter_entry_id: entry.id,
            analysis_type: "full" as const,
            status: "pending" as const,
            requested_by: user.id,
            source_snapshot: buildNewsletterSourceSnapshot(entry),
            queued_at: new Date().toISOString(),
            attempt_count: 0,
            max_attempts: 3,
          })),
        )
        .select("id, newsletter_entry_id, workspace_id, status")
        .returns<AnalysisRow[]>();

      if (insertError || !insertedAnalyses) {
        throw insertError || new Error("Failed to create analysis jobs");
      }

      queuedAnalyses.push(...insertedAnalyses);
    }

    scheduleBackgroundTask(processQueuedAnalyses(supabase, queuedAnalyses));

    return jsonResponse(
      {
        queued: queuedAnalyses.length,
        analyses: queuedAnalyses,
        status: "pending",
      },
      202,
    );
  } catch (error) {
    console.error("enqueue-newsletter-analysis error:", error);

    if (error instanceof HttpError) {
      return jsonResponse({ error: getErrorMessage(error) }, error.status);
    }

    return jsonResponse({ error: "Unable to queue newsletter analysis." }, 500);
  }
});
