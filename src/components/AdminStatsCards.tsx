import { Card, CardContent } from "@/components/ui/card";
import { Store, Package, Calendar, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminStatsCardsProps {
  totalBrands: number;
  totalShops: number;
  upcomingDrops: number;
  lockedAccounts: number;
  loading: boolean;
}

export function AdminStatsCards({
  totalBrands,
  totalShops,
  upcomingDrops,
  lockedAccounts,
  loading,
}: AdminStatsCardsProps) {
  const stats = [
    {
      title: "Total Brands",
      value: totalBrands,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Shops",
      value: totalShops,
      icon: Store,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Upcoming Drops",
      value: upcomingDrops,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Locked Accounts",
      value: lockedAccounts,
      icon: ShieldAlert,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

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
        return (
          <Card
            key={stat.title}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
