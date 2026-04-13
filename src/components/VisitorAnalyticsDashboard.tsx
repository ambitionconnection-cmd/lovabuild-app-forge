import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Eye, UserPlus, Globe, Smartphone, Monitor, Download,
  ArrowRight, RefreshCw, Calendar as CalendarIcon,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DateRange = "today" | "7d" | "30d" | "custom";

interface OverviewStats {
  visitorsToday: number;
  visitorsWeek: number;
  visitorsMonth: number;
  uniqueSessions: number;
  authenticatedPct: number;
  anonymousPct: number;
  newSignupsToday: number;
  newSignupsWeek: number;
}

interface TrafficSource {
  source: string;
  count: number;
}

interface PagePopularity {
  page: string;
  views: number;
}

interface FunnelStep {
  name: string;
  event: string;
  count: number;
  dropoff: number;
}

interface GeoRow {
  country: string;
  visitors: number;
}

interface DeviceSplit {
  type: string;
  count: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(350, 65%, 50%)",
  "hsl(270, 50%, 55%)",
];

const FUNNEL_EVENTS = [
  { name: "App Opened", event: "app_opened" },
  { name: "Map Loaded", event: "map_loaded" },
  { name: "Pin Tapped", event: "pin_tapped" },
  { name: "Shop Viewed", event: "shop_viewed" },
  { name: "Signup Started", event: "signup_started" },
  { name: "Signup Completed", event: "signup_completed" },
];

export function VisitorAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [pagePopularity, setPagePopularity] = useState<PagePopularity[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [geoData, setGeoData] = useState<GeoRow[]>([]);
  const [deviceSplit, setDeviceSplit] = useState<DeviceSplit[]>([]);
  const [retention, setRetention] = useState<{ sessions: string; users: number }[]>([]);

  const getDateBounds = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "7d":
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case "30d":
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case "custom":
        return {
          from: customFrom ? startOfDay(customFrom) : startOfDay(subDays(now, 7)),
          to: customTo ? endOfDay(customTo) : endOfDay(now),
        };
    }
  }, [dateRange, customFrom, customTo]);

  const fetchData = useCallback(async () => {
    const { from, to } = getDateBounds();
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    try {
      // Fetch all data in parallel
      const [
        sessionsRes,
        pageViewsRes,
        eventsRes,
        signupsToday,
        signupsWeek,
      ] = await Promise.all([
        supabase
          .from("visitor_sessions")
          .select("*")
          .gte("first_seen", fromISO)
          .lte("first_seen", toISO),
        supabase
          .from("page_views")
          .select("*")
          .gte("viewed_at", fromISO)
          .lte("viewed_at", toISO),
        supabase
          .from("app_events")
          .select("*")
          .gte("created_at", fromISO)
          .lte("created_at", toISO),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfDay(new Date()).toISOString()),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", subDays(new Date(), 7).toISOString()),
      ]);

      const sessions = sessionsRes.data || [];
      const pageViews = pageViewsRes.data || [];
      const events = eventsRes.data || [];

      // Overview
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      const visitorsToday = sessions.filter(s => new Date(s.first_seen) >= today).length;
      const visitorsWeek = sessions.filter(s => new Date(s.first_seen) >= weekAgo).length;
      const visitorsMonth = sessions.filter(s => new Date(s.first_seen) >= monthAgo).length;
      const authenticated = sessions.filter(s => s.is_authenticated).length;
      const total = sessions.length || 1;

      setOverview({
        visitorsToday,
        visitorsWeek,
        visitorsMonth,
        uniqueSessions: sessions.length,
        authenticatedPct: Math.round((authenticated / total) * 100),
        anonymousPct: Math.round(((total - authenticated) / total) * 100),
        newSignupsToday: signupsToday.count || 0,
        newSignupsWeek: signupsWeek.count || 0,
      });

      // Traffic sources
      const sourceMap = new Map<string, number>();
      sessions.forEach(s => {
        const src = s.referrer || "direct";
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      setTrafficSources(
        Array.from(sourceMap, ([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // Page popularity
      const pageMap = new Map<string, number>();
      pageViews.forEach(pv => {
        pageMap.set(pv.page_name, (pageMap.get(pv.page_name) || 0) + 1);
      });
      setPagePopularity(
        Array.from(pageMap, ([page, views]) => ({ page, views }))
          .sort((a, b) => b.views - a.views)
      );

      // Funnel
      const funnelData: FunnelStep[] = FUNNEL_EVENTS.map((step, i) => {
        const count = events.filter(e => e.event_name === step.event).length;
        return { name: step.name, event: step.event, count, dropoff: 0 };
      });
      for (let i = 1; i < funnelData.length; i++) {
        const prev = funnelData[i - 1].count;
        const curr = funnelData[i].count;
        funnelData[i].dropoff = prev > 0 ? Math.round(((prev - curr) / prev) * 100) : 0;
      }
      setFunnel(funnelData);

      // Geography
      const geoMap = new Map<string, number>();
      sessions.forEach(s => {
        const country = s.country || "Unknown";
        geoMap.set(country, (geoMap.get(country) || 0) + 1);
      });
      setGeoData(
        Array.from(geoMap, ([country, visitors]) => ({ country, visitors }))
          .sort((a, b) => b.visitors - a.visitors)
      );

      // Device split
      const deviceMap = new Map<string, number>();
      sessions.forEach(s => {
        const dt = s.device_type || "unknown";
        deviceMap.set(dt, (deviceMap.get(dt) || 0) + 1);
      });
      setDeviceSplit(Array.from(deviceMap, ([type, count]) => ({ type, count })));

      // Retention (sessions per authenticated user)
      const userSessionMap = new Map<string, number>();
      sessions.filter(s => s.user_id).forEach(s => {
        userSessionMap.set(s.user_id!, (userSessionMap.get(s.user_id!) || 0) + 1);
      });
      const retentionMap = new Map<string, number>();
      userSessionMap.forEach(count => {
        const bucket = count >= 10 ? "10+" : count >= 5 ? "5-9" : count >= 3 ? "3-4" : count === 2 ? "2" : "1";
        retentionMap.set(bucket, (retentionMap.get(bucket) || 0) + 1);
      });
      const order = ["1", "2", "3-4", "5-9", "10+"];
      setRetention(order.map(sessions => ({
        sessions,
        users: retentionMap.get(sessions) || 0,
      })));

    } catch (err) {
      console.error("Error fetching visitor analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateBounds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExportPDF = () => {
    if (!overview) return;

    const doc = new jsPDF();
    const { from, to } = getDateBounds();
    const rangeLabel = `${format(from, "MMM dd, yyyy")} — ${format(to, "MMM dd, yyyy")}`;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FLYAF Analytics Report", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(rangeLabel, 14, 28);
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 34);

    let y = 44;

    // Overview metrics
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Overview", 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Visitors Today", String(overview.visitorsToday)],
        ["Visitors This Week", String(overview.visitorsWeek)],
        ["Visitors This Month", String(overview.visitorsMonth)],
        ["Unique Sessions", String(overview.uniqueSessions)],
        ["Authenticated %", `${overview.authenticatedPct}%`],
        ["Anonymous %", `${overview.anonymousPct}%`],
        ["New Signups Today", String(overview.newSignupsToday)],
        ["New Signups This Week", String(overview.newSignupsWeek)],
      ],
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Traffic Sources
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Traffic Sources", 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Source", "Visitors"]],
      body: trafficSources.map(s => [s.source, String(s.count)]),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Page Popularity
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Page Popularity", 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Page", "Views"]],
      body: pagePopularity.map(p => [p.page, String(p.views)]),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Funnel
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Conversion Funnel", 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Step", "Count", "Drop-off %"]],
      body: funnel.map(f => [f.name, String(f.count), f.dropoff > 0 ? `${f.dropoff}%` : "—"]),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Geography
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Geography", 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Country", "Visitors"]],
      body: geoData.slice(0, 20).map(g => [g.country, String(g.visitors)]),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Device split
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Device Split", 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Device", "Count", "%"]],
      body: deviceSplit.map(d => {
        const totalD = deviceSplit.reduce((s, x) => s + x.count, 0) || 1;
        return [d.type, String(d.count), `${Math.round((d.count / totalD) * 100)}%`];
      }),
      theme: "grid",
      headStyles: { fillColor: [30, 30, 30] },
    });

    doc.save(`flyaf-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!overview) return null;

  const totalDevices = deviceSplit.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Visitor Analytics</h2>
          <p className="text-sm text-muted-foreground">Track all app activity for signed-in and anonymous users</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range pills */}
          {(["today", "7d", "30d"] as DateRange[]).map(r => (
            <Button
              key={r}
              variant={dateRange === r ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(r)}
            >
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : "30 Days"}
            </Button>
          ))}
          {/* Custom range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={dateRange === "custom" ? "default" : "outline"} size="sm">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1">From</p>
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={(d) => { setCustomFrom(d); setDateRange("custom"); }}
                    className={cn("p-2 pointer-events-auto")}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">To</p>
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={(d) => { setCustomTo(d); setDateRange("custom"); }}
                    className={cn("p-2 pointer-events-auto")}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today", value: overview.visitorsToday, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "This Week", value: overview.visitorsWeek, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "This Month", value: overview.visitorsMonth, icon: Globe, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Unique Sessions", value: overview.uniqueSessions, icon: Eye, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className={`p-2 rounded-lg ${c.bg} w-fit mb-2`}>
                  <Icon className={`h-5 w-5 ${c.color}`} />
                </div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Auth split + Signups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Authenticated vs Anonymous</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-primary h-4 rounded-full transition-all"
                    style={{ width: `${overview.authenticatedPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{overview.authenticatedPct}% signed in</span>
                  <span>{overview.anonymousPct}% anonymous</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="p-2 rounded-lg bg-green-500/10 w-fit mb-2">
              <UserPlus className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{overview.newSignupsToday}</p>
            <p className="text-xs text-muted-foreground">New Signups Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="p-2 rounded-lg bg-green-500/10 w-fit mb-2">
              <UserPlus className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{overview.newSignupsWeek}</p>
            <p className="text-xs text-muted-foreground">New Signups This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
          <CardDescription>How visitors arrive at the app</CardDescription>
        </CardHeader>
        <CardContent>
          {trafficSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trafficSources} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="source" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Visitors" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">No traffic data yet</div>
          )}
        </CardContent>
      </Card>

      {/* Page Popularity */}
      <Card>
        <CardHeader>
          <CardTitle>Page Popularity</CardTitle>
          <CardDescription>Most viewed pages</CardDescription>
        </CardHeader>
        <CardContent>
          {pagePopularity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pagePopularity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="page" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">No page view data yet</div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>User journey from app open to signup completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnel.map((step, i) => {
              const maxCount = funnel[0]?.count || 1;
              const widthPct = Math.max((step.count / maxCount) * 100, 5);
              return (
                <div key={step.event}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{step.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{step.count}</span>
                      {step.dropoff > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          -{step.dropoff}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-6">
                    <div
                      className="bg-primary h-6 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${widthPct}%` }}
                    >
                      {widthPct > 15 && (
                        <span className="text-xs text-primary-foreground font-medium">
                          {Math.round(widthPct)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {i < funnel.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Geography + Device Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geography */}
        <Card>
          <CardHeader>
            <CardTitle>Geography</CardTitle>
            <CardDescription>Visitor country breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {geoData.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {geoData.map((g, i) => (
                  <div key={g.country} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-sm font-medium">
                      {i + 1}. {g.country}
                    </span>
                    <Badge variant="outline">{g.visitors}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Device Split */}
        <Card>
          <CardHeader>
            <CardTitle>Device Split</CardTitle>
            <CardDescription>Mobile vs Desktop</CardDescription>
          </CardHeader>
          <CardContent>
            {deviceSplit.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={deviceSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="type"
                      label={(entry) => `${entry.type}`}
                    >
                      {deviceSplit.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {deviceSplit.map((d, i) => (
                    <div key={d.type} className="flex items-center gap-3">
                      {d.type === "mobile" ? (
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{d.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.count} ({Math.round((d.count / totalDevices) * 100)}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Retention</CardTitle>
          <CardDescription>How many times authenticated users return (sessions per user)</CardDescription>
        </CardHeader>
        <CardContent>
          {retention.some(r => r.users > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={retention}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sessions" stroke="hsl(var(--muted-foreground))" fontSize={12} label={{ value: "Sessions", position: "insideBottom", offset: -5 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} label={{ value: "Users", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="users" fill="hsl(var(--primary))" name="Users" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">No retention data yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
