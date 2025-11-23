import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, MousePointer, TrendingUp, Users } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailStats {
  email_type: string;
  opens: number;
  clicks: number;
  unique_users: number;
  open_rate: number;
  click_rate: number;
}

export const EmailAnalytics = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [stats, setStats] = useState<EmailStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin, adminLoading, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    const now = new Date();
    let startDate: Date | null = null;
    
    if (timeRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let query = supabase
      .from('email_analytics')
      .select('user_id, email_type, event_type, created_at');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching email analytics:', error);
      setLoading(false);
      return;
    }

    // Process data to calculate stats
    const statsByType = new Map<string, {
      opens: Set<string>;
      clicks: Set<string>;
      users: Set<string>;
    }>();

    data.forEach(event => {
      if (!statsByType.has(event.email_type)) {
        statsByType.set(event.email_type, {
          opens: new Set(),
          clicks: new Set(),
          users: new Set(),
        });
      }

      const typeStats = statsByType.get(event.email_type)!;
      typeStats.users.add(event.user_id);

      if (event.event_type === 'open') {
        typeStats.opens.add(event.user_id);
      } else if (event.event_type === 'click') {
        typeStats.clicks.add(event.user_id);
      }
    });

    const processedStats: EmailStats[] = Array.from(statsByType.entries()).map(([type, data]) => {
      const uniqueUsers = data.users.size;
      const opens = data.opens.size;
      const clicks = data.clicks.size;
      
      return {
        email_type: type,
        opens,
        clicks,
        unique_users: uniqueUsers,
        open_rate: uniqueUsers > 0 ? (opens / uniqueUsers) * 100 : 0,
        click_rate: opens > 0 ? (clicks / opens) * 100 : 0,
      };
    });

    setStats(processedStats);
    setLoading(false);
  };

  if (adminLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You need admin privileges to view email analytics.
        </AlertDescription>
      </Alert>
    );
  }

  const totalStats = stats.reduce(
    (acc, stat) => ({
      opens: acc.opens + stat.opens,
      clicks: acc.clicks + stat.clicks,
      users: acc.users + stat.unique_users,
    }),
    { opens: 0, clicks: 0, users: 0 }
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Analytics</CardTitle>
              <CardDescription>Track email opens and click-through rates</CardDescription>
            </div>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <TabsList>
                <TabsTrigger value="7d">7 Days</TabsTrigger>
                <TabsTrigger value="30d">30 Days</TabsTrigger>
                <TabsTrigger value="all">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : stats.length === 0 ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>No Data Yet</AlertTitle>
              <AlertDescription>
                Email analytics will appear here once emails are sent and users interact with them.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Total Opens</CardTitle>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStats.opens}</div>
                    <p className="text-xs text-muted-foreground">
                      Unique users who opened emails
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                      <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStats.clicks}</div>
                    <p className="text-xs text-muted-foreground">
                      Unique users who clicked links
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Engaged Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStats.users}</div>
                    <p className="text-xs text-muted-foreground">
                      Users who received emails
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Stats by Email Type */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  By Email Type
                </h3>
                {stats.map((stat) => (
                  <Card key={stat.email_type}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base capitalize">
                          {stat.email_type.replace(/_/g, ' ')}
                        </CardTitle>
                        <Badge variant="outline">{stat.unique_users} users</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Opens</p>
                          <p className="text-2xl font-bold">{stat.opens}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Clicks</p>
                          <p className="text-2xl font-bold">{stat.clicks}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Open Rate</p>
                          <p className="text-2xl font-bold">{stat.open_rate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Click Rate</p>
                          <p className="text-2xl font-bold">{stat.click_rate.toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
