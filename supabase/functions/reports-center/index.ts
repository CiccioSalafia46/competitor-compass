import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertWorkspaceAnalyst,
  assertWorkspaceMember,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import {
  generateReportRun,
  getDefaultRangeDays,
  getNextScheduledRun,
  mapReportRunRow,
  mapReportScheduleRow,
  updateScheduleNextRun,
  validateReportTemplateKey,
  validateScheduleInput,
} from "../_shared/reports.ts";

type ActionBody = {
  action?: string;
  workspaceId?: string;
  templateKey?: string;
  rangeDays?: number;
  schedule?: Record<string, unknown>;
  scheduleId?: string;
};

type ReportScheduleRow = {
  id: string;
  name: string;
  template_key: string;
  frequency: string;
  day_of_week: number | null;
  hour_of_day: number;
  minute_of_hour: number;
  timezone: string;
  range_days: number;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReportRunRow = {
  id: string;
  schedule_id: string | null;
  template_key: string;
  title: string;
  status: string;
  generated_at: string;
  created_at: string;
  error_message: string | null;
  payload: unknown;
};

async function parseBody(req: Request): Promise<ActionBody> {
  try {
    return (await req.json()) as ActionBody;
  } catch {
    throw new HttpError(400, "Invalid request body.");
  }
}

function requireWorkspaceId(body: ActionBody) {
  if (!body.workspaceId || typeof body.workspaceId !== "string") {
    throw new HttpError(400, "workspaceId is required.");
  }

  return body.workspaceId;
}

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
    const body = await parseBody(req);
    const action = body.action ?? "list";
    const workspaceId = requireWorkspaceId(body);

    if (action === "list") {
      await assertWorkspaceMember(supabase, user.id, workspaceId);

      const [schedulesResult, runsResult] = await Promise.all([
        supabase
          .from<ReportScheduleRow>("report_schedules")
          .select("id, name, template_key, frequency, day_of_week, hour_of_day, minute_of_hour, timezone, range_days, is_active, next_run_at, last_run_at, created_at, updated_at")
          .eq("workspace_id", workspaceId)
          .order("next_run_at", { ascending: true })
          .limit(25),
        supabase
          .from<ReportRunRow>("report_runs")
          .select("id, schedule_id, template_key, title, status, generated_at, created_at, error_message, payload")
          .eq("workspace_id", workspaceId)
          .order("generated_at", { ascending: false })
          .limit(12),
      ]);

      if (schedulesResult.error) {
        throw schedulesResult.error;
      }

      if (runsResult.error) {
        throw runsResult.error;
      }

      return jsonResponse({
        schedules: (schedulesResult.data ?? []).map(mapReportScheduleRow),
        recentRuns: (runsResult.data ?? []).map((row) =>
          mapReportRunRow({ ...row, payload: (row.payload ?? null) as ReportRunRow["payload"] }),
        ),
      });
    }

    if (action === "generate") {
      await assertWorkspaceAnalyst(supabase, user.id, workspaceId);
      const templateKey = validateReportTemplateKey(body.templateKey);
      const run = await generateReportRun(supabase, {
        workspaceId,
        templateKey,
        rangeDays: body.rangeDays ?? getDefaultRangeDays(templateKey),
        createdBy: user.id,
      });

      return jsonResponse({ run });
    }

    if (action === "save_schedule") {
      await assertWorkspaceAnalyst(supabase, user.id, workspaceId);
      if (!body.schedule || typeof body.schedule !== "object") {
        throw new HttpError(400, "schedule is required.");
      }

      const scheduleInput = validateScheduleInput(body.schedule);
      const nextRunAt = scheduleInput.isActive ? getNextScheduledRun(scheduleInput, new Date()) : null;

      if (scheduleInput.id) {
        const updateResult = await supabase
          .from<ReportScheduleRow>("report_schedules")
          .update({
            name: scheduleInput.name,
            template_key: scheduleInput.templateKey,
            frequency: scheduleInput.frequency,
            day_of_week: scheduleInput.dayOfWeek,
            hour_of_day: scheduleInput.hourOfDay,
            minute_of_hour: scheduleInput.minuteOfHour,
            timezone: scheduleInput.timezone,
            range_days: scheduleInput.rangeDays,
            is_active: scheduleInput.isActive,
            next_run_at: nextRunAt,
          })
          .eq("id", scheduleInput.id)
          .eq("workspace_id", workspaceId)
          .select("id, name, template_key, frequency, day_of_week, hour_of_day, minute_of_hour, timezone, range_days, is_active, next_run_at, last_run_at, created_at, updated_at")
          .maybeSingle();

        if (updateResult.error || !updateResult.data) {
          throw updateResult.error ?? new Error("Failed to update report schedule.");
        }

        return jsonResponse({ schedule: mapReportScheduleRow(updateResult.data) });
      }

      const insertResult = await supabase
        .from<ReportScheduleRow>("report_schedules")
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          name: scheduleInput.name,
          template_key: scheduleInput.templateKey,
          frequency: scheduleInput.frequency,
          day_of_week: scheduleInput.dayOfWeek,
          hour_of_day: scheduleInput.hourOfDay,
          minute_of_hour: scheduleInput.minuteOfHour,
          timezone: scheduleInput.timezone,
          range_days: scheduleInput.rangeDays,
          is_active: scheduleInput.isActive,
          next_run_at: nextRunAt,
        })
        .select("id, name, template_key, frequency, day_of_week, hour_of_day, minute_of_hour, timezone, range_days, is_active, next_run_at, last_run_at, created_at, updated_at")
        .maybeSingle();

      if (insertResult.error || !insertResult.data) {
        throw insertResult.error ?? new Error("Failed to create report schedule.");
      }

      return jsonResponse({ schedule: mapReportScheduleRow(insertResult.data) });
    }

    if (action === "delete_schedule") {
      await assertWorkspaceAnalyst(supabase, user.id, workspaceId);

      if (!body.scheduleId || typeof body.scheduleId !== "string") {
        throw new HttpError(400, "scheduleId is required.");
      }

      const deleteResult = await supabase
        .from<ReportScheduleRow>("report_schedules")
        .delete()
        .eq("id", body.scheduleId)
        .eq("workspace_id", workspaceId);

      if (deleteResult.error) {
        throw deleteResult.error;
      }

      return jsonResponse({ success: true });
    }

    if (action === "run_due") {
      await assertWorkspaceAnalyst(supabase, user.id, workspaceId);

      const dueResult = await supabase
        .from<ReportScheduleRow>("report_schedules")
        .select("id, name, template_key, frequency, day_of_week, hour_of_day, minute_of_hour, timezone, range_days, is_active, next_run_at, last_run_at, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .lte("next_run_at", new Date().toISOString())
        .order("next_run_at", { ascending: true })
        .limit(10);

      if (dueResult.error) {
        throw dueResult.error;
      }

      const schedules = (dueResult.data ?? []).map(mapReportScheduleRow);
      const generatedRuns = [];

      for (const schedule of schedules) {
        const run = await generateReportRun(supabase, {
          workspaceId,
          templateKey: schedule.templateKey,
          rangeDays: schedule.rangeDays,
          createdBy: user.id,
          scheduleId: schedule.id,
        });
        generatedRuns.push(run);
        await updateScheduleNextRun(supabase, schedule, new Date());
      }

      return jsonResponse({
        processed: schedules.length,
        generatedRuns,
      });
    }

    throw new HttpError(400, "Unsupported action.");
  } catch (error) {
    const message = getErrorMessage(error);
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }

    console.error("[reports-center] unhandled error", error);
    return jsonResponse({ error: message }, 500);
  }
});
