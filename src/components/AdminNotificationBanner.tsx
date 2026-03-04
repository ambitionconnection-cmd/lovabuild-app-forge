import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Eye, Inbox, AlertTriangle, CheckCircle } from "lucide-react";

interface NotificationCounts {
  unresolvedContacts: number;
  pendingPosts: number;
  pendingBrandRequests: number;
}

interface AdminNotificationBannerProps {
  onNavigate: (tab: string) => void;
}

export function AdminNotificationBanner({ onNavigate }: AdminNotificationBannerProps) {
  const [counts, setCounts] = useState<NotificationCounts>({
    unresolvedContacts: 0,
    pendingPosts: 0,
    pendingBrandRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [contactsRes, postsRes, brandReqRes] = await Promise.all([
        supabase
          .from("contact_submissions")
          .select("id", { count: "exact", head: true })
          .eq("is_resolved", false),
        supabase
          .from("street_spotted_posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("brand_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      setCounts({
        unresolvedContacts: contactsRes.count || 0,
        pendingPosts: postsRes.count || 0,
        pendingBrandRequests: brandReqRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching notification counts:", error);
    } finally {
      setLoading(false);
    }
  };

  const total = counts.unresolvedContacts + counts.pendingPosts + counts.pendingBrandRequests;

  if (loading) return null;

  const items = [
    {
      count: counts.unresolvedContacts,
      label: "unread message",
      plural: "unread messages",
      icon: MessageSquare,
      tab: "contact-messages",
      color: "bg-blue-500",
    },
    {
      count: counts.pendingPosts,
      label: "post pending approval",
      plural: "posts pending approval",
      icon: Eye,
      tab: "spot-moderation",
      color: "bg-amber-500",
    },
    {
      count: counts.pendingBrandRequests,
      label: "brand request",
      plural: "brand requests",
      icon: Inbox,
      tab: "brand-requests",
      color: "bg-purple-500",
    },
  ];

  const activeItems = items.filter((item) => item.count > 0);

  if (total === 0) {
    return (
      <Card className="mb-6 border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-semibold text-green-600">All Clear</span>
            <span className="text-sm text-muted-foreground">— No pending items require your attention</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Action Required</span>
          <Badge variant="destructive" className="text-xs">{total}</Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                onClick={() => onNavigate(item.tab)}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.color} text-white text-xs font-bold`}>
                  {item.count}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.count === 1 ? item.label : item.plural}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
