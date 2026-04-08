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
  CalendarClock,
  Download,
  FileBarChart,
  FileCog,
  FileText,
  PlayCircle,
  Printer,
  RefreshCcw,
  SlidersHorizontal,
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
  boxShadow: "var(--shadow-md)",
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

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{payload.title}</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                {payload.subtitle}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
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
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Active competitors</p>
              <p className="mt-2 text-2xl font-semibold">{payload.metadata.activeCompetitors}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tracked signals</p>
              <p className="mt-2 text-2xl font-semibold">{payload.metadata.trackedSignals}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Structured insights</p>
              <p className="mt-2 text-2xl font-semibold">{payload.metadata.structuredInsights}</p>
            </CardContent>
          </Card>
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Generated</p>
              <p className="mt-2 text-sm font-semibold">{formatDateTime(payload.generatedAt)}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">What changed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{payload.summary.whatChanged}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">What matters most</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{payload.summary.whatMatters}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {payload.charts.map((chart) => (
          <Card key={chart.id} className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{chart.title}</CardTitle>
              {chart.description ? <CardDescription>{chart.description}</CardDescription> : null}
            </CardHeader>
            <CardContent>
              <ReportChartView chart={chart} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        {payload.sections.map((section) => (
          <Card key={section.id} className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <CardDescription>{section.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.metrics?.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {section.metrics.map((metric) => (
                    <div key={`${section.id}-${metric.label}`} className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{metric.value}</p>
                      {metric.detail ? <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {section.callouts?.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {section.callouts.map((callout) => (
                    <div
                      key={`${section.id}-${callout.title}`}
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        callout.tone === "warning" && "border-warning/30 bg-warning/5",
                        callout.tone === "positive" && "border-primary/20 bg-primary/5",
                        (!callout.tone || callout.tone === "neutral") && "bg-muted/10",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{callout.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{callout.body}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {section.bullets?.length ? (
                <ul className="space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                  {section.bullets.map((item) => (
                    <li key={`${section.id}-${item}`}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {section.table ? (
                <div className="overflow-x-auto rounded-xl border">
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
                    <tbody>
                      {section.table.rows.map((row, rowIndex) => (
                        <tr key={`${section.id}-row-${rowIndex}`} className="border-t">
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
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Prioritized insights</CardTitle>
            <CardDescription>
              Structured insight briefs ready for team review and stakeholder distribution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payload.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prioritized insights were available for this run.</p>
            ) : (
              payload.insights.map((insight) => (
                <div key={insight.id} className="rounded-xl border bg-muted/10 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {insight.priorityLevel}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {insight.impactArea}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.takeaway}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recommended actions</CardTitle>
            <CardDescription>
              Concrete follow-up moves derived from the highest-signal report findings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payload.actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-up actions were generated for this run.</p>
            ) : (
              payload.actions.map((action) => (
                <div key={action.title} className="rounded-xl border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{action.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.detail}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Generate structured team reports, save recurring schedules, and export stakeholder-ready briefings with charts and strategic insights.
          </p>
          {!canCreateReports ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Read-only mode. Analyst or admin access is required to generate and schedule reports.
            </p>
          ) : null}
          {currentWorkspace ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Workspace: <span className="font-medium text-foreground">{currentWorkspace.name}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void runDueSchedules()}
            disabled={!canCreateReports || runningDue}
          >
            <PlayCircle className="h-4 w-4" />
            {runningDue ? "Running..." : dueCount > 0 ? `Run due (${dueCount})` : "Run due"}
          </Button>
          <Button className="gap-2" onClick={() => openCreateSchedule()} disabled={!canCreateReports}>
            <CalendarClock className="h-4 w-4" />
            Schedule report
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border">
              <CardContent className="p-5">
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(REPORT_TEMPLATES).map(([key, template]) => {
              const isCustom = key === "custom_report";
              const icon =
                key === "weekly_competitor_pulse" ? (
                  <FileBarChart className="h-5 w-5" />
                ) : key === "promo_digest" ? (
                  <FileCog className="h-5 w-5" />
                ) : key === "custom_report" ? (
                  <SlidersHorizontal className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                );

              return (
                <Card key={key} className="border shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{template.label}</CardTitle>
                        <CardDescription className="mt-2">{template.description}</CardDescription>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {icon}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                      {isCustom ? "Configurable range" : `Default range: ${template.defaultRangeDays} day${template.defaultRangeDays === 1 ? "" : "s"}`}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isCustom ? (
                        <Button
                          className="gap-2"
                          onClick={() => setBuilderOpen(true)}
                          disabled={!canCreateReports}
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          Build report
                        </Button>
                      ) : (
                        <>
                          <Button
                            className="gap-2"
                            onClick={() => void handleGenerate(key as ReportTemplateKey, template.defaultRangeDays)}
                            disabled={!canCreateReports || generatingTemplate === key}
                          >
                            <WandSparkles className="h-4 w-4" />
                            {generatingTemplate === key ? "Generating..." : "Generate"}
                          </Button>
                          <Button variant="outline" onClick={() => openCreateSchedule(key as ReportTemplateKey)} disabled={!canCreateReports}>
                            Schedule
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Saved schedules</CardTitle>
                <CardDescription>
                  Persist recurring templates per workspace so the team can generate them consistently.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {schedules.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                    No schedules saved yet.
                  </div>
                ) : (
                  schedules.map((schedule) => (
                    <div key={schedule.id} className="rounded-xl border px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{schedule.name}</p>
                            <Badge variant={schedule.isActive ? "secondary" : "outline"}>
                              {schedule.isActive ? "Active" : "Paused"}
                            </Badge>
                            <Badge variant="outline">
                              {REPORT_TEMPLATES[schedule.templateKey].label}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {schedule.frequency === "weekly"
                              ? `Weekly on ${weekdayOptions.find((option) => Number(option.value) === (schedule.dayOfWeek ?? 1))?.label ?? "Monday"}`
                              : "Daily"} at {`${String(schedule.hourOfDay).padStart(2, "0")}:${String(schedule.minuteOfHour).padStart(2, "0")}`} ({schedule.timezone})
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Next run {formatDateTime(schedule.nextRunAt)} · Last run {formatDateTime(schedule.lastRunAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setScheduleDialogOpen(true);
                            }}
                            disabled={!canCreateReports}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void deleteSchedule(schedule.id)}
                            disabled={!canCreateReports}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Recent runs</CardTitle>
                <CardDescription>
                  Last generated reports, ready for review, export, or stakeholder sharing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentRuns.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                    No reports generated yet.
                  </div>
                ) : (
                  recentRuns.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className={cn(
                        "block w-full rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary/30",
                        run.id === selectedRun?.id && "border-primary bg-primary/5",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{run.title}</p>
                        <Badge variant={run.status === "completed" ? "secondary" : "outline"}>
                          {run.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {REPORT_TEMPLATES[run.templateKey].label} · Generated {formatDateTime(run.generatedAt)}
                      </p>
                      {run.errorMessage ? (
                        <p className="mt-1 text-xs text-destructive">{run.errorMessage}</p>
                      ) : null}
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="report" className="space-y-4">
            <TabsList>
              <TabsTrigger value="report">Selected report</TabsTrigger>
              <TabsTrigger value="process">How this works</TabsTrigger>
            </TabsList>
            <TabsContent value="report">
              {selectedRun ? (
                <ReportViewer run={selectedRun} />
              ) : (
                <Card className="border">
                  <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    Generate or select a report run to inspect the full briefing.
                  </CardContent>
                </Card>
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
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p>On-demand generation: template to `reports-center` to analytics RPC + insights + competitor intelligence to persisted `report_runs.payload`.</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p>Scheduled generation: saved `report_schedules` compute `next_run_at`; the due runner can generate all overdue schedules for the current workspace in one pass.</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
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
