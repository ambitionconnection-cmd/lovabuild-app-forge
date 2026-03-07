import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { showUndoToast } from "@/hooks/useAdminUndo";
import { Check, X, Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface BrandRequest {
  id: string;
  brand_name: string;
  requested_by: string;
  post_id: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export const BrandRequestsQueue = () => {
  const [requests, setRequests] = useState<BrandRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from("brand_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    }

    const { data, error } = await query as { data: BrandRequest[] | null; error: any };
    if (error) {
      console.error(error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const prev = requests.find(r => r.id === id);
    const { error } = await supabase
      .from("brand_requests")
      .update({ status, resolved_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update request");
    } else {
      showUndoToast({
        message: `Request ${status}`,
        table: "brand_requests",
        undoData: { id, status: prev?.status || "pending", resolved_at: null },
        undoType: "update",
        updateColumn: "status",
        onUndo: () => fetchRequests(),
      });
      fetchRequests();
    }
  };

  // Group by brand name to show frequency
  const brandCounts = requests.reduce<Record<string, number>>((acc, r) => {
    const key = r.brand_name.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sortedRequests = [...requests].sort((a, b) => {
    const countA = brandCounts[a.brand_name.toLowerCase()] || 0;
    const countB = brandCounts[b.brand_name.toLowerCase()] || 0;
    return countB - countA;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Brand Requests</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              Pending
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No brand requests yet
          </p>
        ) : (
          <div className="space-y-3">
            {sortedRequests.map((req) => {
              const count = brandCounts[req.brand_name.toLowerCase()] || 1;
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{req.brand_name}</span>
                      {count > 1 && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <TrendingUp className="w-3 h-3" /> {count}x requested
                        </Badge>
                      )}
                      <Badge variant={
                        req.status === "pending" ? "outline" :
                        req.status === "added" ? "default" : "secondary"
                      } className="text-[10px]">
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(req.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => updateStatus(req.id, "added")}
                      >
                        <Check className="w-3 h-3 mr-1" /> Added
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => updateStatus(req.id, "dismissed")}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
