import { Card, CardContent } from "@/components/ui/card";
import { Store, Package, Calendar, ShieldAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TrendData {
  value: number;
  percentage: number;
  direction: "up" | "down" | "neutral";
}

interface AdminStatsCardsProps {
  totalBrands: number;
  totalShops: number;
  upcomingDrops: number;
  lockedAccounts: number;
  loading: boolean;
  trends?: {
    brands?: TrendData;
    shops?: TrendData;
    drops?: TrendData;
    locked?: TrendData;
  };
}

export function AdminStatsCards({
  totalBrands,
  totalShops,
  upcomingDrops,
  lockedAccounts,
  loading,
  trends,
}: AdminStatsCardsProps) {
  const stats = [
    {
      title: "Total Brands",
      value: totalBrands,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: trends?.brands,
      isPositiveGood: true,
    },
    {
      title: "Total Shops",
      value: totalShops,
      icon: Store,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trend: trends?.shops,
      isPositiveGood: true,
    },
    {
      title: "Upcoming Drops",
      value: upcomingDrops,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trend: trends?.drops,
      isPositiveGood: true,
    },
    {
      title: "Locked Accounts",
      value: lockedAccounts,
      icon: ShieldAlert,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      trend: trends?.locked,
      isPositiveGood: false, // For locked accounts, decrease is good
    },
  ];

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "up":
        return TrendingUp;
      case "down":
        return TrendingDown;
      default:
        return Minus;
    }
  };

  const getTrendColor = (direction: string, isPositiveGood: boolean) => {
    if (direction === "neutral") return "text-muted-foreground";
    
    const isGoodTrend = 
      (direction === "up" && isPositiveGood) || 
      (direction === "down" && !isPositiveGood);
    
    return isGoodTrend ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-lg mb-4" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const hasTrend = stat.trend && stat.trend.direction !== "neutral";
        const TrendIcon = stat.trend ? getTrendIcon(stat.trend.direction) : Minus;
        const trendColor = stat.trend 
          ? getTrendColor(stat.trend.direction, stat.isPositiveGood) 
          : "text-muted-foreground";
        
        return (
          <Card
            key={stat.title}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    {stat.trend && (
                      <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
                        <TrendIcon className="h-4 w-4" />
                        <span>{Math.abs(stat.trend.percentage).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  {stat.trend && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.trend.direction === "up" ? "+" : stat.trend.direction === "down" ? "-" : ""}
                      {Math.abs(stat.trend.value)} vs last week
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
