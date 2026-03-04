import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Crown, Gift, UserPlus, Download, Printer } from "lucide-react";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface UserStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  foundingMembers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface DailySignup {
  date: string;
  signups: number;
}

export function UserAnalytics() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dailySignups, setDailySignups] = useState<DailySignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = subDays(now, 7).toISOString();
      const monthAgo = subDays(now, 30).toISOString();

      const [allProfiles, proProfiles, foundingProfiles, todayProfiles, weekProfiles, monthProfiles] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_pro", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_founding_member", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
      ]);

      const total = allProfiles.count || 0;
      const pro = proProfiles.count || 0;

      setStats({
        totalUsers: total,
        proUsers: pro,
        freeUsers: total - pro,
        foundingMembers: foundingProfiles.count || 0,
        newUsersToday: todayProfiles.count || 0,
        newUsersThisWeek: weekProfiles.count || 0,
        newUsersThisMonth: monthProfiles.count || 0,
      });

      // Fetch daily signups for last 30 days
      const { data: recentProfiles } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", monthAgo)
        .order("created_at", { ascending: true });

      const dailyMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        dailyMap.set(format(subDays(now, i), "MMM dd"), 0);
      }
      recentProfiles?.forEach((p) => {
        if (p.created_at) {
          const key = format(new Date(p.created_at), "MMM dd");
          dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
        }
      });
      setDailySignups(Array.from(dailyMap, ([date, signups]) => ({ date, signups })));
    } catch (error) {
      console.error("Error fetching user analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!stats) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", stats.totalUsers],
      ["Pro Users", stats.proUsers],
      ["Free Users", stats.freeUsers],
      ["Founding Members", stats.foundingMembers],
      ["New Users Today", stats.newUsersToday],
      ["New Users This Week", stats.newUsersThisWeek],
      ["New Users This Month", stats.newUsersThisMonth],
      [""],
      ["Date", "New Signups"],
      ...dailySignups.map((d) => [d.date, d.signups]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Pro Subscribers", value: stats.proUsers, icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Free Users", value: stats.freeUsers, icon: Users, color: "text-muted-foreground", bg: "bg-muted/50" },
    { label: "Founding Members", value: stats.foundingMembers, icon: Gift, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "New Today", value: stats.newUsersToday, icon: UserPlus, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "New This Week", value: stats.newUsersThisWeek, icon: UserPlus, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  return (
    <div className="space-y-6 print:space-y-4" id="user-analytics">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">User & Subscriber Analytics</h2>
          <p className="text-sm text-muted-foreground">Overview of your user base</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => {
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

      <Card>
        <CardHeader>
          <CardTitle>Daily Signups (Last 30 Days)</CardTitle>
          <CardDescription>
            {stats.newUsersThisMonth} new users this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySignups}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={2} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pro Conversion Rate</span>
              <Badge variant="outline">
                {stats.totalUsers > 0 ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-amber-500 h-3 rounded-full transition-all"
                style={{ width: `${stats.totalUsers > 0 ? (stats.proUsers / stats.totalUsers) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.freeUsers} free</span>
              <span>{stats.proUsers} pro</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
