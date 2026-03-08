import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ShoppingBag, MousePointerClick, TrendingUp, ExternalLink } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

interface ClickRow {
  id: string;
  post_id: string;
  platform: string;
  item_brand: string;
  item_model: string;
  item_category: string;
  created_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  stockx: "hsl(var(--primary))",
  goat: "hsl(var(--muted-foreground))",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(180, 50%, 45%)",
];

export function ShopThisFitAnalytics() {
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("shop_this_fit_clicks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!error && data) setClicks(data as ClickRow[]);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  // --- Compute analytics ---
  const totalClicks = clicks.length;

  // Platform breakdown
  const platformCounts: Record<string, number> = {};
  clicks.forEach((c) => {
    platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
  });
  const platformData = Object.entries(platformCounts).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  // Top brands
  const brandCounts: Record<string, number> = {};
  clicks.forEach((c) => {
    brandCounts[c.item_brand] = (brandCounts[c.item_brand] || 0) + 1;
  });
  const topBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, clicks]) => ({ name, clicks }));

  // Top categories
  const catCounts: Record<string, number> = {};
  clicks.forEach((c) => {
    catCounts[c.item_category] = (catCounts[c.item_category] || 0) + 1;
  });
  const categoryData = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Daily trend (last 30 days)
  const last30 = subDays(new Date(), 30);
  const dailyMap: Record<string, { stockx: number; goat: number }> = {};
  for (let i = 0; i <= 30; i++) {
    const key = format(subDays(new Date(), 30 - i), "yyyy-MM-dd");
    dailyMap[key] = { stockx: 0, goat: 0 };
  }
  clicks.forEach((c) => {
    const d = format(parseISO(c.created_at), "yyyy-MM-dd");
    if (dailyMap[d]) {
      if (c.platform === "stockx") dailyMap[d].stockx++;
      else if (c.platform === "goat") dailyMap[d].goat++;
    }
  });
  const trendData = Object.entries(dailyMap).map(([date, val]) => ({
    date: format(parseISO(date), "MMM d"),
    StockX: val.stockx,
    GOAT: val.goat,
    Total: val.stockx + val.goat,
  }));

  // Unique posts clicked
  const uniquePosts = new Set(clicks.map((c) => c.post_id)).size;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <MousePointerClick className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-bold">{totalClicks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <ShoppingBag className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unique Posts Shopped</p>
              <p className="text-2xl font-bold">{uniquePosts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <ExternalLink className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">StockX Clicks</p>
              <p className="text-2xl font-bold">{platformCounts["stockx"] || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GOAT Clicks</p>
              <p className="text-2xl font-bold">{platformCounts["goat"] || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Click trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Click Trends (Last 30 Days)</CardTitle>
          <CardDescription>Daily breakdown by platform</CardDescription>
        </CardHeader>
        <CardContent>
          {totalClicks === 0 ? (
            <p className="text-center text-muted-foreground py-12">No click data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Line type="monotone" dataKey="StockX" stroke="hsl(210, 70%, 55%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="GOAT" stroke="hsl(280, 60%, 55%)" strokeWidth={2} dot={false} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Brands */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Clicked Brands</CardTitle>
            <CardDescription>Most searched brands from outfit detection</CardDescription>
          </CardHeader>
          <CardContent>
            {topBrands.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topBrands} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Platform & Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
            <CardDescription>Clicks by detected item category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent clicks table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Clicks</CardTitle>
          <CardDescription>Last 20 SHOP THIS FIT interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {clicks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No clicks recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Time</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Brand</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Model</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Category</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Platform</th>
                  </tr>
                </thead>
                <tbody>
                  {clicks.slice(0, 20).map((click) => (
                    <tr key={click.id} className="border-b border-border/50">
                      <td className="py-2 px-3 text-muted-foreground">
                        {format(parseISO(click.created_at), "MMM d, HH:mm")}
                      </td>
                      <td className="py-2 px-3 font-medium">{click.item_brand}</td>
                      <td className="py-2 px-3 text-muted-foreground">{click.item_model}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">{click.item_category}</Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant={click.platform === "stockx" ? "default" : "secondary"} className="text-xs">
                          {click.platform.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
