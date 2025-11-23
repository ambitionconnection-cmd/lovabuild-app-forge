import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, MousePointerClick, Copy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface AnalyticsSummary {
  drop_id: string;
  drop_title: string;
  affiliate_clicks: number;
  discount_code_copies: number;
  total_events: number;
}

interface DailyStats {
  date: string;
  clicks: number;
  copies: number;
}

const Analytics = () => {
  const [summary, setSummary] = useState<AnalyticsSummary[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7); // days

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      // Fetch summary data
      const { data: summaryData, error: summaryError } = await supabase
        .from('drops')
        .select(`
          id,
          title,
          affiliate_analytics (
            event_type
          )
        `)
        .order('created_at', { ascending: false });

      if (summaryError) throw summaryError;

      // Process summary data
      const processedSummary = summaryData?.map(drop => ({
        drop_id: drop.id,
        drop_title: drop.title,
        affiliate_clicks: drop.affiliate_analytics?.filter((a: any) => a.event_type === 'affiliate_click').length || 0,
        discount_code_copies: drop.affiliate_analytics?.filter((a: any) => a.event_type === 'discount_code_copy').length || 0,
        total_events: drop.affiliate_analytics?.length || 0,
      })).filter(d => d.total_events > 0) || [];

      setSummary(processedSummary);

      // Fetch daily stats for the selected date range
      const startDate = startOfDay(subDays(new Date(), dateRange));
      
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('affiliate_analytics')
        .select('event_type, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (analyticsError) throw analyticsError;

      // Group by day
      const dailyMap = new Map<string, { clicks: number; copies: number }>();
      
      for (let i = 0; i < dateRange; i++) {
        const date = format(subDays(new Date(), dateRange - 1 - i), 'MMM dd');
        dailyMap.set(date, { clicks: 0, copies: 0 });
      }

      analyticsData?.forEach(event => {
        const date = format(new Date(event.created_at), 'MMM dd');
        const current = dailyMap.get(date) || { clicks: 0, copies: 0 };
        
        if (event.event_type === 'affiliate_click') {
          current.clicks++;
        } else if (event.event_type === 'discount_code_copy') {
          current.copies++;
        }
        
        dailyMap.set(date, current);
      });

      const dailyArray = Array.from(dailyMap, ([date, stats]) => ({
        date,
        clicks: stats.clicks,
        copies: stats.copies,
      }));

      setDailyStats(dailyArray);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const totalClicks = summary.reduce((sum, item) => sum + item.affiliate_clicks, 0);
  const totalCopies = summary.reduce((sum, item) => sum + item.discount_code_copies, 0);
  const totalEvents = totalClicks + totalCopies;
  const conversionRate = totalClicks > 0 ? ((totalCopies / totalClicks) * 100).toFixed(1) : '0';

  const topDrops = [...summary]
    .sort((a, b) => b.total_events - a.total_events)
    .slice(0, 5);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  const pieData = topDrops.map(drop => ({
    name: drop.drop_title.length > 20 ? drop.drop_title.substring(0, 20) + '...' : drop.drop_title,
    value: drop.total_events,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Affiliate Analytics</h1>
              <p className="text-sm text-muted-foreground">Track performance and conversions</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant={dateRange === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(7)}
              >
                7 Days
              </Button>
              <Button
                variant={dateRange === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(30)}
              >
                30 Days
              </Button>
              <Button
                variant={dateRange === 90 ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(90)}
              >
                90 Days
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Events</CardDescription>
                  <CardTitle className="text-3xl font-bold">{totalEvents}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 mr-1" />
                    All interactions
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Affiliate Clicks</CardDescription>
                  <CardTitle className="text-3xl font-bold">{totalClicks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MousePointerClick className="h-4 w-4 mr-1" />
                    Link clicks
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Code Copies</CardDescription>
                  <CardTitle className="text-3xl font-bold">{totalCopies}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Copy className="h-4 w-4 mr-1" />
                    Discount codes
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Conversion Rate</CardDescription>
                  <CardTitle className="text-3xl font-bold">{conversionRate}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Codes per click
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Trend</CardTitle>
                <CardDescription>Track clicks and code copies over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Affiliate Clicks"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="copies" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      name="Code Copies"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Drops - Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Drops</CardTitle>
                  <CardDescription>Ranked by total interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {topDrops.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topDrops}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="drop_title" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="affiliate_clicks" fill="hsl(var(--primary))" name="Clicks" />
                        <Bar dataKey="discount_code_copies" fill="hsl(var(--secondary))" name="Codes" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No data available yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Distribution - Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Distribution</CardTitle>
                  <CardDescription>Share of total events by drop</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No data available yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Performance</CardTitle>
                <CardDescription>Complete breakdown by drop</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border">
                        <tr className="text-left">
                          <th className="pb-3 font-semibold">Drop</th>
                          <th className="pb-3 font-semibold text-center">Clicks</th>
                          <th className="pb-3 font-semibold text-center">Codes</th>
                          <th className="pb-3 font-semibold text-center">Total</th>
                          <th className="pb-3 font-semibold text-center">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.map((item) => {
                          const ctr = item.affiliate_clicks > 0 
                            ? ((item.discount_code_copies / item.affiliate_clicks) * 100).toFixed(1)
                            : '0';
                          
                          return (
                            <tr key={item.drop_id} className="border-b border-border last:border-0">
                              <td className="py-3">{item.drop_title}</td>
                              <td className="py-3 text-center">{item.affiliate_clicks}</td>
                              <td className="py-3 text-center">{item.discount_code_copies}</td>
                              <td className="py-3 text-center font-semibold">{item.total_events}</td>
                              <td className="py-3 text-center">{ctr}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No analytics data available yet. Interactions will appear here once users start clicking affiliate links.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Analytics;
