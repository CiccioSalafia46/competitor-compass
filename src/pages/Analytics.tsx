import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(200, 60%, 50%)",
  "hsl(140, 50%, 45%)", "hsl(50, 80%, 45%)",
];

const chartTooltipStyle = {
  fontSize: 11,
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  boxShadow: "var(--shadow-md)",
};

function ChartCard({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) {
  return (
    <Card className="border">
      <CardHeader className="pb-1 space-y-0">
        <CardTitle className="text-xs font-medium text-foreground">{title}</CardTitle>
        {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, loading } = useAnalyticsData();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        <div className="page-header">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-2" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border"><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">No workspace selected.</p>
      </div>
    );
  }

  const hasNewsletters = data.newslettersByWeek.length > 0;
  const hasAds = data.adsByWeek.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-description">Competitor activity trends and campaign intelligence</p>
        </div>
      </div>

      {!hasNewsletters && !hasAds && (
        <Card className="border">
          <CardContent className="py-16 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Not enough data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Import competitor data or track campaigns to see analytics.</p>
          </CardContent>
        </Card>
      )}

      {/* Activity over time */}
      <div className="grid lg:grid-cols-2 gap-4">
        {hasNewsletters && (
          <ChartCard title="Campaign Volume" description="Weekly competitor campaign frequency">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.newslettersByWeek} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name="Campaigns" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {hasAds && (
          <ChartCard title="Ad Volume" description="Weekly Meta ad activity">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.adsByWeek} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} name="Ads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Competitor comparison */}
      {data.competitorActivity.length > 0 && (
        <ChartCard title="Competitor Activity" description="Campaigns vs ads by competitor">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.competitorActivity} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="competitor" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="newsletters" fill="hsl(var(--chart-1))" name="Campaigns" radius={[0, 3, 3, 0]} />
                <Bar dataKey="ads" fill="hsl(var(--chart-3))" name="Ads" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Distributions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {data.ctaDistribution.length > 0 && (
          <ChartCard title="CTA Distribution" description="Ad CTA types">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.ctaDistribution} dataKey="count" nameKey="cta" cx="50%" cy="50%" outerRadius={70} innerRadius={30}
                    label={({ cta, percent }) => `${cta} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} style={{ fontSize: 9 }}>
                    {data.ctaDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {data.categoryDistribution.length > 0 && (
          <ChartCard title="Product Categories" description="From competitor analysis">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryDistribution.slice(0, 6)} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={50} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {data.campaignTypes.length > 0 && (
          <ChartCard title="Campaign Types" description="Extracted classification">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.campaignTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70} innerRadius={30}
                    label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} style={{ fontSize: 9 }}>
                    {data.campaignTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Promo & urgency */}
      <div className="grid lg:grid-cols-2 gap-4">
        {data.promotionFrequency.length > 0 && (
          <ChartCard title="Promotion Frequency" description="How often each competitor runs promos">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.promotionFrequency} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="competitor" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="promos" fill="hsl(var(--chart-5))" name="Promos" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="total" fill="hsl(var(--chart-1))" name="Total" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {data.urgencyFrequency.length > 0 && (
          <ChartCard title="Urgency Signals" description="Frequency of urgency tactics">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.urgencyFrequency.slice(0, 6)} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 9 }} width={100} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider text-center">
        All metrics observed from platform data · no estimates
      </p>
    </div>
  );
}
