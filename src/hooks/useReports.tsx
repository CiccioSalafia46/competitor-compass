import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { getErrorMessage } from "@/lib/errors";
import type {
  CustomReportConfig,
  ReportRunRecord,
  ReportScheduleInput,
  ReportScheduleRecord,
  ReportTemplateKey,
} from "@/lib/reports";

type ReportsListResponse = {
  schedules: ReportScheduleRecord[];
  recentRuns: ReportRunRecord[];
};

type GenerateReportResponse = {
  run: ReportRunRecord;
};

type SaveScheduleResponse = {
  schedule: ReportScheduleRecord;
};

type RunDueResponse = {
  processed: number;
  generatedRuns: ReportRunRecord[];
};

export function useReports() {
  const { currentWorkspace } = useWorkspace();
  const [schedules, setSchedules] = useState<ReportScheduleRecord[]>([]);
  const [recentRuns, setRecentRuns] = useState<ReportRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTemplate, setGeneratingTemplate] = useState<ReportTemplateKey | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningDue, setRunningDue] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!currentWorkspace) {
      setSchedules([]);
      setRecentRuns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await invokeEdgeFunction<ReportsListResponse>("reports-center", {
        body: {
          action: "list",
          workspaceId: currentWorkspace.id,
        },
      });

      setSchedules(response.schedules ?? []);
      setRecentRuns(response.recentRuns ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load reports."));
      setSchedules([]);
      setRecentRuns([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const generate = useCallback(
    async (templateKey: ReportTemplateKey, rangeDays?: number, customConfig?: CustomReportConfig) => {
      if (!currentWorkspace) {
        return null;
      }

      setGeneratingTemplate(templateKey);
      try {
        const response = await invokeEdgeFunction<GenerateReportResponse>("reports-center", {
          body: {
            action: "generate",
            workspaceId: currentWorkspace.id,
            templateKey,
            rangeDays,
            ...(customConfig ? { customConfig } : {}),
          },
        });

        setRecentRuns((previous) => [response.run, ...previous.filter((run) => run.id !== response.run.id)].slice(0, 12));
        if (response.run.status === "failed") {
          toast.error(response.run.errorMessage || "Report generation failed.");
        } else {
          toast.success("Report generated.");
        }
        return response.run;
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to generate report."));
        return null;
      } finally {
        setGeneratingTemplate(null);
      }
    },
    [currentWorkspace],
  );

  const saveSchedule = useCallback(
    async (schedule: ReportScheduleInput) => {
      if (!currentWorkspace) {
        return null;
      }

      setSavingSchedule(true);
      try {
        const response = await invokeEdgeFunction<SaveScheduleResponse>("reports-center", {
          body: {
            action: "save_schedule",
            workspaceId: currentWorkspace.id,
            schedule,
          },
        });

        setSchedules((previous) => {
          const next = previous.filter((item) => item.id !== response.schedule.id);
          return [...next, response.schedule].sort((left, right) => {
            const leftTime = left.nextRunAt ? new Date(left.nextRunAt).getTime() : Number.POSITIVE_INFINITY;
            const rightTime = right.nextRunAt ? new Date(right.nextRunAt).getTime() : Number.POSITIVE_INFINITY;
            return leftTime - rightTime;
          });
        });
        toast.success(schedule.id ? "Schedule updated." : "Schedule created.");
        return response.schedule;
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to save report schedule."));
        return null;
      } finally {
        setSavingSchedule(false);
      }
    },
    [currentWorkspace],
  );

  const deleteSchedule = useCallback(
    async (scheduleId: string) => {
      if (!currentWorkspace) {
        return false;
      }

      try {
        await invokeEdgeFunction("reports-center", {
          body: {
            action: "delete_schedule",
            workspaceId: currentWorkspace.id,
            scheduleId,
          },
        });
        setSchedules((previous) => previous.filter((schedule) => schedule.id !== scheduleId));
        toast.success("Schedule deleted.");
        return true;
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to delete report schedule."));
        return false;
      }
    },
    [currentWorkspace],
  );

  const runDueSchedules = useCallback(async () => {
    if (!currentWorkspace) {
      return [] as ReportRunRecord[];
    }

    setRunningDue(true);
    try {
      const response = await invokeEdgeFunction<RunDueResponse>("reports-center", {
        body: {
          action: "run_due",
          workspaceId: currentWorkspace.id,
        },
      });

      if (response.generatedRuns.length > 0) {
        setRecentRuns((previous) => [...response.generatedRuns, ...previous].slice(0, 12));
        const completed = response.generatedRuns.filter((run) => run.status === "completed").length;
        const failed = response.generatedRuns.filter((run) => run.status === "failed").length;
        if (completed > 0) {
          toast.success(completed === 1 ? "1 scheduled report generated." : `${completed} scheduled reports generated.`);
        }
        if (failed > 0) {
          toast.error(failed === 1 ? "1 scheduled report failed." : `${failed} scheduled reports failed.`);
        }
      } else {
        toast.message("No due report schedules.");
      }

      await fetchReports();
      return response.generatedRuns;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to run due schedules."));
      return [] as ReportRunRecord[];
    } finally {
      setRunningDue(false);
    }
  }, [currentWorkspace, fetchReports]);

  return {
    schedules,
    recentRuns,
    loading,
    generatingTemplate,
    savingSchedule,
    runningDue,
    generate,
    saveSchedule,
    deleteSchedule,
    runDueSchedules,
    refetch: fetchReports,
  };
}
