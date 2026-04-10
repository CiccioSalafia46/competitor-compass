import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileBarChart,
  FileCog,
  FileText,
  Info,
  Lightbulb,
  PlayCircle,
  Printer,
  RefreshCcw,
  SlidersHorizontal,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useRoles } from "@/hooks/useRoles";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadReportJson, printReport } from "@/lib/report-export";
import {
  CUSTOM_REPORT_SECTION_LABELS,
  REPORT_TEMPLATES,
  type CustomReportConfig,
  type CustomReportSection,
  type GeneratedReportPayload,
  type ReportChart,
  type ReportRunRecord,
  type ReportScheduleInput,
  type ReportScheduleRecord,
  type ReportTemplateKey,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

const chartTooltipStyle = {
  fontSize: 11,
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const weekdayOptions = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

const rangeOptions = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScheduleDialog({
  open,
  onOpenChange,
  onSave,
  schedule,
  saving,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSave: (value: ReportScheduleInput) => Promise<void>;
  schedule: ReportScheduleRecord | null;
  saving: boolean;
}) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [draft, setDraft] = useState<ReportScheduleInput>({
    name: "",
    templateKey: "weekly_competitor_pulse",
    frequency: "weekly",
    dayOfWeek: 1,
    hourOfDay: 9,
    minuteOfHour: 0,
    timezone,
    rangeDays: 7,
    isActive: true,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (schedule) {
      setDraft({
        id: schedule.id,
        name: schedule.name,
        templateKey: schedule.templateKey,
        frequency: schedule.frequency,
        dayOfWeek: schedule.dayOfWeek,
        hourOfDay: schedule.hourOfDay,
        minuteOfHour: schedule.minuteOfHour,
        timezone: schedule.timezone,
        rangeDays: schedule.rangeDays,
        isActive: schedule.isActive,
      });
      return;
    }

    setDraft({
      name: "",
      templateKey: "weekly_competitor_pulse",
      frequency: "weekly",
      dayOfWeek: 1,
      hourOfDay: 9,
      minuteOfHour: 0,
      timezone,
      rangeDays: REPORT_TEMPLATES.weekly_competitor_pulse.defaultRangeDays,
      isActive: true,
    });
  }, [open, schedule, timezone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit report schedule" : "Create report schedule"}</DialogTitle>
          <DialogDescription>
            Save recurring report settings for this workspace. Due schedules can be generated manually now and attached to a cron runner later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-schedule-name">Name</Label>
            <Input
              id="report-schedule-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Monday competitor pulse"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={draft.templateKey}
                onValueChange={(value) => {
                  const templateKey = value as ReportTemplateKey;
                  setDraft((current) => ({
                    ...current,
                    templateKey,
                    rangeDays: REPORT_TEMPLATES[templateKey].defaultRangeDays,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={draft.frequency}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    frequency: value === "daily" ? "daily" : "weekly",
                    dayOfWeek: value === "daily" ? null : current.dayOfWeek ?? 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {draft.frequency === "weekly" ? (
              <div className="space-y-2">
                <Label>Weekday</Label>
                <Select
                  value={String(draft.dayOfWeek ?? 1)}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, dayOfWeek: Number(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekdayOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Weekday</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                  Daily
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="report-hour">Hour (0–23)</Label>
              <Input
                id="report-hour"
                type="number"
                min={0}
                max={23}
                value={draft.hourOfDay}
                onChange={(event) => {
                  const v = Math.min(23, Math.max(0, Math.round(Number(event.target.value))));
                  setDraft((current) => ({ ...current, hourOfDay: isNaN(v) ? 0 : v }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-minute">Minute (0–59)</Label>
              <Input
                id="report-minute"
                type="number"
                min={0}
                max={59}
                value={draft.minuteOfHour}
                onChange={(event) => {
                  const v = Math.min(59, Math.max(0, Math.round(Number(event.target.value))));
                  setDraft((current) => ({ ...current, minuteOfHour: isNaN(v) ? 0 : v }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Coverage window</Label>
              <Select
                value={String(draft.rangeDays)}
                onValueChange={(value) => setDraft((current) => ({ ...current, rangeDays: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-timezone">Timezone</Label>
              <Input
                id="report-timezone"
                value={draft.timezone}
                onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}
                placeholder="Europe/Rome"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active schedule</p>
              <p className="text-xs text-muted-foreground">
                Inactive schedules stay saved but are ignored by the due runner.
              </p>
            </div>
            <Switch
              checked={draft.isActive}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSave(draft)}
            disabled={saving || !draft.name.trim()}
          >
            {saving ? "Saving..." : schedule ? "Update schedule" : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ALL_SECTIONS = Object.keys(CUSTOM_REPORT_SECTION_LABELS) as CustomReportSection[];

function ReportBuilderDialog({
  open,
  onOpenChange,
  onGenerate,
  generating,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onGenerate: (config: CustomReportConfig) => Promise<void>;
  generating: boolean;
}) {
  const [title, setTitle] = useState("Custom report");
  const [sections, setSections] = useState<CustomReportSection[]>(ALL_SECTIONS);
  const [rangeDays, setRangeDays] = useState(30);
  const [competitorInput, setCompetitorInput] = useState("");

  const competitorFilter = competitorInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleSection = (section: CustomReportSection) => {
    setSections((previous) =>
      previous.includes(section) ? previous.filter((s) => s !== section) : [...previous, section],
    );
  };

  const handleGenerate = async () => {
    await onGenerate({
      title: title.trim() || "Custom report",
      sections,
      competitorFilter,
      rangeDays,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Custom report builder</DialogTitle>
          <DialogDescription>
            Choose which sections to include, the date range, and optional competitor filters.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="custom-report-title">Report title</Label>
            <Input
              id="custom-report-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Custom report"
            />
          </div>

          <div className="space-y-3">
            <Label>Sections to include</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SECTIONS.map((section) => (
                <div key={section} className="flex items-center gap-2">
                  <Checkbox
                    id={`section-${section}`}
                    checked={sections.includes(section)}
                    onCheckedChange={() => toggleSection(section)}
                  />
                  <label
                    htmlFor={`section-${section}`}
                    className="cursor-pointer text-sm text-foreground"
                  >
                    {CUSTOM_REPORT_SECTION_LABELS[section]}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {sections.length} of {ALL_SECTIONS.length} sections selected
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Coverage window</Label>
              <Select
                value={String(rangeDays)}
                onValueChange={(value) => setRangeDays(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor-filter">Competitor filter</Label>
              <Input
                id="competitor-filter"
                value={competitorInput}
                onChange={(event) => setCompetitorInput(event.target.value)}
                placeholder="Acme, Globex (optional)"
              />
              <p className="text-[11px] text-muted-foreground">Comma-separated names. Leave blank to include all.</p>
            </div>
          </div>

          {sections.length > 0 ? (
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Preview</p>
              <p className="mt-1 text-sm font-medium text-foreground">{title.trim() || "Custom report"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {sections.map((s) => CUSTOM_REPORT_SECTION_LABELS[s]).join(" · ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last {rangeDays} days
                {competitorFilter.length > 0 ? ` · Filtered: ${competitorFilter.join(", ")}` : " · All competitors"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
              Select at least one section to generate a report.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleGenerate()}
            disabled={generating || sections.length === 0}
          >
            <WandSparkles className="mr-2 h-4 w-4" />
            {generating ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportChartView({ chart }: { chart: ReportChart }) {
  if (!chart.data.length) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        No chart data available in this report.
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {chart.kind === "line" ? (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chart.series.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chart.series.map((series) => (
              <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function insightPriorityClass(level: string) {
  if (level === "high") return "high" as const;
  if (level === "medium") return "medium" as const;
  return "low" as const;
}

function actionPriorityClass(priority: string) {
  if (priority === "high") return "high" as const;
  if (priority === "medium") return "medium" as const;
  return "low" as const;
}

function ReportViewer({ run }: { run: ReportRunRecord }) {
  if (!run.payload) {
    return (
      <Card className="border border-destructive/20 bg-destructive/5">
        <CardContent className="space-y-2 p-6">
          <p className="text-sm font-semibold text-foreground">This report run failed</p>
          <p className="text-sm text-muted-foreground">
            {run.errorMessage || "The report run failed before a payload could be saved."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const payload = run.payload as GeneratedReportPayload;
  const insights = payload.insights ?? [];
  const actions = payload.actions ?? [];

  return (
    <div className="space-y-5">

      {/* ── REPORT HEADER ── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
        <div className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{payload.title}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{payload.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadReportJson(run)}>
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => printReport(payload)}>
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t bg-muted/20 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Competitors</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{payload.metadata.activeCompetitors}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Signals</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{payload.metadata.trackedSignals}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Insights</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{payload.metadata.structuredInsights}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Generated</span>
            <span className="text-xs font-medium text-muted-foreground">{formatDateTime(payload.generatedAt)}</span>
          </div>
        </div>
      </div>

      {/* ── EXECUTIVE BRIEF ── */}
      <div className="overflow-hidden rounded-xl border bg-gradient-to-br from-primary/[0.04] to-transparent shadow-sm">
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h3 className="text-[13px] font-semibold text-foreground">Executive Brief</h3>
          <span className="ml-auto text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">Top-line summary</span>
        </div>
        <div className="grid gap-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="px-6 py-5">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">What changed</p>
            <p className="text-[13px] leading-7 text-foreground">{payload.summary.whatChanged}</p>
          </div>
          <div className="px-6 py-5">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">What matters most</p>
            <p className="text-[13px] leading-7 text-foreground">{payload.summary.whatMatters}</p>
          </div>
        </div>
      </div>

      {/* ── CHARTS ── */}
      {payload.charts.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {payload.charts.map((chart) => (
            <Card key={chart.id} className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px] font-semibold">{chart.title}</CardTitle>
                {chart.description ? <CardDescription className="text-xs">{chart.description}</CardDescription> : null}
              </CardHeader>
              <CardContent>
                <ReportChartView chart={chart} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── SECTIONS ── */}
      {payload.sections.length > 0 && (
        <div className="space-y-4">
          {payload.sections.map((section, sectionIndex) => (
            <div key={section.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {/* Section header */}
              <div className="flex items-start gap-3 border-b bg-muted/15 px-6 py-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-[11px] font-bold text-primary">
                  {sectionIndex + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-foreground">{section.title}</h3>
                  {section.summary && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{section.summary}</p>
                  )}
                </div>
              </div>

              <div className="space-y-5 p-6">
                {/* Metrics */}
                {section.metrics?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {section.metrics.map((metric) => (
                      <div key={`${section.id}-${metric.label}`} className="rounded-lg border bg-card p-4 shadow-sm">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{metric.value}</p>
                        {metric.detail ? (
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{metric.detail}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Callouts */}
                {section.callouts?.length ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {section.callouts.map((callout) => {
                      const isWarning = callout.tone === "warning";
                      const isPositive = callout.tone === "positive";
                      return (
                        <div
                          key={`${section.id}-${callout.title}`}
                          className={cn(
                            "flex gap-3 rounded-lg border-l-4 bg-card px-4 py-4 shadow-sm",
                            isWarning && "border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20",
                            isPositive && "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
                            !isWarning && !isPositive && "border-l-border bg-muted/20",
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isWarning && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            {isPositive && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            {!isWarning && !isPositive && <Info className="h-4 w-4 text-muted-foreground/60" />}
                          </div>
                          <div className="min-w-0">
                            <p className={cn(
                              "text-[13px] font-semibold",
                              isWarning && "text-amber-700 dark:text-amber-300",
                              isPositive && "text-emerald-700 dark:text-emerald-300",
                              !isWarning && !isPositive && "text-foreground",
                            )}>
                              {callout.title}
                            </p>
                            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{callout.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Bullets */}
                {section.bullets?.length ? (
                  <ul className="space-y-2.5">
                    {section.bullets.map((item) => (
                      <li key={`${section.id}-${item}`} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Table */}
                {section.table ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        <tr>
                          {section.table.columns.map((column) => (
                            <th key={`${section.id}-${column}`} className="px-4 py-3 font-medium">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {section.table.rows.map((row, rowIndex) => (
                          <tr key={`${section.id}-row-${rowIndex}`} className="transition-colors hover:bg-muted/20">
                            {section.table?.columns.map((column) => (
                              <td key={`${section.id}-${rowIndex}-${column}`} className="px-4 py-3 text-muted-foreground">
                                {String(row[column] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PRIORITIZED INSIGHTS ── */}
      {insights.length > 0 && (
        <div className="overflow-hidden rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 border-b bg-muted/15 px-6 py-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">Prioritized Insights</h3>
              <p className="text-[11px] text-muted-foreground">
                {insights.length} structured insight{insights.length !== 1 ? "s" : ""} ready for team review
              </p>
            </div>
          </div>
          <div className="divide-y">
            {insights.map((insight, idx) => {
              const p = insightPriorityClass(insight.priorityLevel);
              return (
                <div
                  key={insight.id}
                  className={cn(
                    "flex gap-4 px-6 py-4",
                    p === "high" && "bg-destructive/[0.03]",
                    p === "medium" && "bg-amber-50/40 dark:bg-amber-950/10",
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    p === "high" && "bg-destructive/15 text-destructive",
                    p === "medium" && "bg-amber-400/20 text-amber-600 dark:text-amber-400",
                    p === "low" && "bg-muted text-muted-foreground",
                  )}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground">{insight.title}</p>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        p === "high" && "bg-destructive/10 text-destructive",
                        p === "medium" && "bg-amber-400/15 text-amber-600 dark:text-amber-400",
                        p === "low" && "bg-muted text-muted-foreground",
                      )}>
                        {insight.priorityLevel}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                        {insight.impactArea}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{insight.takeaway}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RECOMMENDED ACTIONS ── */}
      {actions.length > 0 && (
        <div className="overflow-hidden rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 border-b bg-muted/15 px-6 py-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">Recommended Actions</h3>
              <p className="text-[11px] text-muted-foreground">
                Concrete follow-up moves derived from the highest-signal findings
              </p>
            </div>
          </div>
          <div className="divide-y">
            {actions.map((action, idx) => {
              const p = actionPriorityClass(action.priority);
              return (
                <div key={action.title} className="flex gap-4 px-6 py-4 transition-colors hover:bg-muted/20">
                  <div className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                    p === "high" && "bg-destructive/10 text-destructive",
                    p === "medium" && "bg-amber-400/15 text-amber-600 dark:text-amber-400",
                    p === "low" && "bg-primary/10 text-primary",
                  )}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground">{action.title}</p>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        p === "high" && "bg-destructive/10 text-destructive",
                        p === "medium" && "bg-amber-400/15 text-amber-600 dark:text-amber-400",
                        p === "low" && "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400",
                      )}>
                        {action.priority}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{action.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

export default function Reports() {
  const { currentWorkspace } = useWorkspace();
  const { canCreateReports, canViewData } = useRoles();
  const {
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
    refetch,
  } = useReports();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportScheduleRecord | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const selectedRun = useMemo(
    () => recentRuns.find((run) => run.id === selectedRunId) ?? recentRuns[0] ?? null,
    [recentRuns, selectedRunId],
  );

  useEffect(() => {
    if (!selectedRunId && recentRuns.length > 0) {
      setSelectedRunId(recentRuns[0].id);
    }
  }, [recentRuns, selectedRunId]);

  const dueCount = schedules.filter((schedule) => {
    if (!schedule.isActive || !schedule.nextRunAt) {
      return false;
    }

    return new Date(schedule.nextRunAt).getTime() <= Date.now();
  }).length;

  const handleGenerate = async (templateKey: ReportTemplateKey, rangeDays?: number) => {
    const run = await generate(templateKey, rangeDays);
    if (run) {
      setSelectedRunId(run.id);
    }
  };

  const handleGenerateCustom = async (config: CustomReportConfig) => {
    const run = await generate("custom_report", config.rangeDays, config);
    if (run) {
      setSelectedRunId(run.id);
    }
  };

  const openCreateSchedule = (templateKey?: ReportTemplateKey) => {
    setEditingSchedule(
      templateKey
        ? {
            id: "",
            name: REPORT_TEMPLATES[templateKey].label,
            templateKey,
            frequency: templateKey === "weekly_competitor_pulse" ? "weekly" : "daily",
            dayOfWeek: templateKey === "weekly_competitor_pulse" ? 1 : null,
            hourOfDay: 9,
            minuteOfHour: 0,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            rangeDays: REPORT_TEMPLATES[templateKey].defaultRangeDays,
            isActive: true,
            nextRunAt: null,
            lastRunAt: null,
            createdAt: "",
            updatedAt: "",
          }
        : null,
    );
    setScheduleDialogOpen(true);
  };

  if (!canViewData) {
    return (
      <div className="p-6">
        <Card className="border">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Reports are unavailable until you join a workspace with data access.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="-mx-4 -mt-4 mb-0 h-1 w-[calc(100%+2rem)] bg-gradient-to-r from-primary via-primary/50 to-transparent sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="page-title">Reports</h1>
          <p className="page-description">
            Structured briefings, recurring schedules, and stakeholder-ready exports.
          </p>
          {!canCreateReports && (
            <p className="text-xs text-muted-foreground/60">
              Read-only — analyst or admin access required.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void refetch()}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => void runDueSchedules()}
            disabled={!canCreateReports || runningDue}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {runningDue ? "Running…" : dueCount > 0 ? `Run due (${dueCount})` : "Run due"}
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openCreateSchedule()} disabled={!canCreateReports}>
            <CalendarClock className="h-3.5 w-3.5" />
            Schedule
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border overflow-hidden">
              <div className="border-b bg-muted/20 px-4 py-3.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-full" />
              </div>
              <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(REPORT_TEMPLATES).map(([key, template]) => {
              const isCustom = key === "custom_report";
              const icon =
                key === "weekly_competitor_pulse" ? (
                  <FileBarChart className="h-4 w-4" />
                ) : key === "promo_digest" ? (
                  <FileCog className="h-4 w-4" />
                ) : key === "custom_report" ? (
                  <SlidersHorizontal className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                );

              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border border-l-[3px] overflow-hidden transition-shadow hover:shadow-md",
                    key === "weekly_competitor_pulse" && "border-l-primary",
                    key === "promo_digest" && "border-l-amber-400",
                    key === "custom_report" && "border-l-violet-500",
                    key !== "weekly_competitor_pulse" && key !== "promo_digest" && key !== "custom_report" && "border-l-emerald-500",
                  )}
                >
                  <div className="flex items-start gap-3 border-b bg-muted/20 px-4 py-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-snug text-foreground">{template.label}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="text-[11px] text-muted-foreground/70">
                      {isCustom ? "Configurable date range" : `Default: last ${template.defaultRangeDays} day${template.defaultRangeDays === 1 ? "" : "s"}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {isCustom ? (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => setBuilderOpen(true)}
                          disabled={!canCreateReports}
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Build report
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => void handleGenerate(key as ReportTemplateKey, template.defaultRangeDays)}
                            disabled={!canCreateReports || generatingTemplate === key}
                          >
                            <WandSparkles className="h-3.5 w-3.5" />
                            {generatingTemplate === key ? "Generating…" : "Generate"}
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openCreateSchedule(key as ReportTemplateKey)} disabled={!canCreateReports}>
                            Schedule
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
            <div className="rounded-xl border overflow-hidden">
              <div className="flex items-center gap-2.5 border-b bg-muted/20 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CalendarClock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Saved schedules</p>
                  <p className="text-[11px] text-muted-foreground">Recurring templates that generate automatically for your team.</p>
                </div>
              </div>
              <div className="divide-y">
                {schedules.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No schedules saved yet.
                  </div>
                ) : (
                  schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={cn(
                        "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between transition-colors hover:bg-muted/20",
                        "border-l-[3px]",
                        schedule.isActive ? "border-l-primary" : "border-l-border",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground">{schedule.name}</p>
                          <span className={cn(
                            "inline-flex h-2 w-2 rounded-full",
                            schedule.isActive ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/30",
                          )} />
                          <span className="text-[11px] text-muted-foreground">{REPORT_TEMPLATES[schedule.templateKey].label}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {schedule.frequency === "weekly"
                            ? `Weekly on ${weekdayOptions.find((option) => Number(option.value) === (schedule.dayOfWeek ?? 1))?.label ?? "Monday"}`
                            : "Daily"} at {`${String(schedule.hourOfDay).padStart(2, "0")}:${String(schedule.minuteOfHour).padStart(2, "0")}`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                          Next {formatDateTime(schedule.nextRunAt)} · Last {formatDateTime(schedule.lastRunAt)}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setScheduleDialogOpen(true);
                          }}
                          disabled={!canCreateReports}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/5"
                          onClick={() => void deleteSchedule(schedule.id)}
                          disabled={!canCreateReports}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="flex items-center gap-2.5 border-b bg-muted/20 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileBarChart className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Recent runs</p>
                  <p className="text-[11px] text-muted-foreground">Last generated reports — click to inspect the full briefing.</p>
                </div>
              </div>
              <div className="divide-y">
                {recentRuns.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No reports generated yet.
                  </div>
                ) : (
                  recentRuns.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className={cn(
                        "block w-full px-4 py-3 text-left transition-colors hover:bg-muted/20",
                        "border-l-[3px]",
                        run.id === selectedRun?.id
                          ? "border-l-primary bg-primary/5"
                          : "border-l-transparent",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-medium text-foreground">{run.title}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] py-0",
                            run.status === "completed" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            run.status === "running" && "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400",
                            run.status === "failed" && "border-destructive/30 bg-destructive/10 text-destructive",
                            run.status !== "completed" && run.status !== "running" && run.status !== "failed" && "border-muted text-muted-foreground",
                          )}
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {REPORT_TEMPLATES[run.templateKey].label} · {formatDateTime(run.generatedAt)}
                      </p>
                      {run.errorMessage ? (
                        <p className="mt-1 text-xs text-destructive">{run.errorMessage}</p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="report" className="space-y-4">
            <TabsList className="h-9 bg-muted/40 p-0.5 text-xs">
              <TabsTrigger value="report" className="h-8 text-xs">Selected report</TabsTrigger>
              <TabsTrigger value="process" className="h-8 text-xs">How it works</TabsTrigger>
            </TabsList>
            <TabsContent value="report">
              {selectedRun ? (
                <ReportViewer run={selectedRun} />
              ) : (
                <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
                  Generate or select a report run above to inspect the full briefing.
                </div>
              )}
            </TabsContent>
            <TabsContent value="process">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Report pipeline</CardTitle>
                  <CardDescription>
                    Reports reuse live workspace analytics, structured insights, and competitor intelligence snapshots. Every run is stored as a structured payload for reuse and export.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
                  <div className="flex gap-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">1</div>
                    <p>On-demand generation: template to `reports-center` to analytics RPC + insights + competitor intelligence to persisted `report_runs.payload`.</p>
                  </div>
                  <div className="flex gap-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">2</div>
                    <p>Scheduled generation: saved `report_schedules` compute `next_run_at`; the due runner can generate all overdue schedules for the current workspace in one pass.</p>
                  </div>
                  <div className="flex gap-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">3</div>
                    <p>Exports: JSON for structured downstream use, plus a print-friendly view that can be saved as PDF from the browser.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSave={async (draft) => {
          const result = await saveSchedule(draft);
          if (result) {
            setScheduleDialogOpen(false);
            setEditingSchedule(null);
          }
        }}
        schedule={editingSchedule}
        saving={savingSchedule}
      />

      <ReportBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onGenerate={handleGenerateCustom}
        generating={generatingTemplate === "custom_report"}
      />
    </div>
  );
}
