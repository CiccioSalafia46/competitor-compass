import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = [
  "hsl(220, 80%, 50%)", "hsl(142, 72%, 40%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(180, 60%, 40%)",
  "hsl(320, 60%, 50%)", "hsl(60, 70%, 45%)",
];

function ChartCard({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, loading } = useAnalyticsData();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">No workspace selected.</p>
      </div>
    );
  }

  const hasNewsletters = data.newslettersByWeek.length > 0;
  const hasAds = data.adsByWeek.length > 0;
  const hasExtractions = data.categoryDistribution.length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Competitive activity trends built from observed platform data</p>
      </div>

      {!hasNewsletters && !hasAds && (
        <Card className="border">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Not enough data yet. Import newsletters or track ads to see analytics.</p>
          </CardContent>
        </Card>
      )}

      {/* Row 1: Activity over time */}
      <div className="grid lg:grid-cols-2 gap-4">
        {hasNewsletters && (
          <ChartCard title="Newsletter Volume by Week" description="Observed newsletter frequency">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.newslettersByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(220, 80%, 50%)" radius={[3, 3, 0, 0]} name="Newsletters" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {hasAds && (
          <ChartCard title="Ad Volume by Week" description="Observed Meta ad activity">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.adsByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(142, 72%, 40%)" radius={[3, 3, 0, 0]} name="Ads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Row 2: Competitor activity comparison */}
      {data.competitorActivity.length > 0 && (
        <ChartCard title="Competitor Activity Comparison" description="Newsletters vs ads by competitor (observed)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.competitorActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="competitor" tick={{ fontSize: 10 }} width={100} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="newsletters" fill="hsl(220, 80%, 50%)" name="Newsletters" radius={[0, 3, 3, 0]} />
                <Bar dataKey="ads" fill="hsl(38, 92%, 50%)" name="Ads" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Row 3: Distributions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {data.ctaDistribution.length > 0 && (
          <ChartCard title="CTA Distribution" description="Ad CTA types observed">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.ctaDistribution} dataKey="count" nameKey="cta" cx="50%" cy="50%" outerRadius={80} label={({ cta, percent }) => `${cta} (${(percent * 100).toFixed(0)}%)`}>
                    {data.ctaDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {data.categoryDistribution.length > 0 && (
          <ChartCard title="Product Categories" description="From newsletter extraction">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryDistribution.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(280, 60%, 50%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {data.campaignTypes.length > 0 && (
          <ChartCard title="Campaign Types" description="Extracted campaign classification">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.campaignTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}>
                    {data.campaignTypes.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Row 4: Promotion & urgency */}
      <div className="grid lg:grid-cols-2 gap-4">
        {data.promotionFrequency.length > 0 && (
          <ChartCard title="Promotion Frequency by Competitor" description="How often each competitor runs promos (observed)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.promotionFrequency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="competitor" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="promos" fill="hsl(0, 72%, 51%)" name="Promo emails" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="total" fill="hsl(220, 80%, 50%)" name="Total emails" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {data.urgencyFrequency.length > 0 && (
          <ChartCard title="Urgency Signal Types" description="Frequency of urgency tactics observed">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.urgencyFrequency.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={120} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(38, 92%, 50%)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider text-center">
        All metrics are observed from platform data. No estimates or modeled values.
      </p>
    </div>
  );
}
