import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  status: string;
  style_tags: string[];
}

export const SpotModerationQueue = () => {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("street_spotted_posts")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error fetching pending posts:", error);
      toast.error("Failed to load pending posts");
    }
    setPosts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const updateStatus = async (postId: string, status: "approved" | "rejected") => {
    setActionLoading(postId);
    const { error } = await supabase
      .from("street_spotted_posts")
      .update({ status } as any)
      .eq("id", postId);

    if (error) {
      toast.error(`Failed to ${status} post`);
      console.error(error);
    } else {
      toast.success(status === "approved" ? "Post approved ✅" : "Post rejected");
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Spot Moderation Queue
        </CardTitle>
        <CardDescription>
          {posts.length} post{posts.length !== 1 ? "s" : ""} awaiting review
        </CardDescription>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No posts pending review 🎉</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
              <div key={post.id} className="rounded-xl border border-border overflow-hidden bg-card">
                <img
                  src={post.image_url}
                  alt={post.caption || "Pending post"}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3 space-y-2">
                  {post.caption && (
                    <p className="text-sm text-foreground line-clamp-2">{post.caption}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {post.city && <span>{post.city}</span>}
                    {post.country && <span>{post.country}</span>}
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>
                  {post.style_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.style_tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => updateStatus(post.id, "approved")}
                      disabled={actionLoading === post.id}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1"
                      onClick={() => updateStatus(post.id, "rejected")}
                      disabled={actionLoading === post.id}
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
