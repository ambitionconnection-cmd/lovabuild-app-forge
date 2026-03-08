import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, Eye, Loader2, Sparkles, Trash2, Plus, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DetectedItem {
  category: string;
  brand: string;
  model: string;
  confidence: number;
}

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
  detected_items: DetectedItem[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  hat: "🧢", cap: "🧢", top: "👕", jacket: "🧥", hoodie: "🧥",
  trousers: "👖", shorts: "🩳", shoes: "👟", sneakers: "👟",
  bag: "👜", scarf: "🧣", sunglasses: "🕶️", watch: "⌚", jewelry: "💎", other: "👔",
};

export const SpotModerationQueue = () => {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detectingPost, setDetectingPost] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<Record<string, DetectedItem[]>>({});
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ category: "other", brand: "", model: "" });

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
    const postsData = (data as any[]) || [];
    setPosts(postsData.map(p => ({
      ...p,
      detected_items: p.detected_items || [],
    })));
    // Initialize editing state
    const itemsMap: Record<string, DetectedItem[]> = {};
    postsData.forEach(p => { itemsMap[p.id] = p.detected_items || []; });
    setEditingItems(itemsMap);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const detectItems = async (post: PendingPost) => {
    setDetectingPost(post.id);
    try {
      const response = await supabase.functions.invoke("detect-outfit-items", {
        body: { postId: post.id, imageUrl: post.image_url },
      });

      if (response.error) throw response.error;
      const items: DetectedItem[] = response.data?.items || [];
      setEditingItems(prev => ({ ...prev, [post.id]: items }));
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, detected_items: items } : p));
      toast.success(`Detected ${items.length} item${items.length !== 1 ? "s" : ""}`);
    } catch (err: any) {
      console.error("Detection error:", err);
      toast.error(err?.message || "Detection failed");
    } finally {
      setDetectingPost(null);
    }
  };

  const removeItem = (postId: string, idx: number) => {
    setEditingItems(prev => ({
      ...prev,
      [postId]: prev[postId].filter((_, i) => i !== idx),
    }));
  };

  const handleAddItem = (postId: string) => {
    if (!newItem.brand.trim()) return;
    setEditingItems(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), { ...newItem, confidence: 1 }],
    }));
    setNewItem({ category: "other", brand: "", model: "" });
    setAddingItem(null);
  };

  const updateStatus = async (postId: string, status: "approved" | "rejected") => {
    setActionLoading(postId);
    
    // Save edited items before approving
    const items = editingItems[postId] || [];
    const { error } = await supabase
      .from("street_spotted_posts")
      .update({ status, detected_items: items } as any)
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
            {posts.map(post => {
              const items = editingItems[post.id] || [];
              return (
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

                    {/* AI Detection section */}
                    <div className="border-t border-border/50 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" /> Detected Items
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1 px-2"
                          onClick={() => detectItems(post)}
                          disabled={detectingPost === post.id}
                        >
                          {detectingPost === post.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          {items.length > 0 ? "Re-detect" : "Detect"}
                        </Button>
                      </div>

                      {items.length > 0 && (
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[10px] bg-muted/50 rounded px-2 py-1">
                              <span>{CATEGORY_EMOJI[item.category] || "👔"}</span>
                              <span className="font-semibold truncate">{item.brand}</span>
                              <span className="text-muted-foreground truncate">{item.model}</span>
                              <span className="text-muted-foreground ml-auto flex-shrink-0">{Math.round(item.confidence * 100)}%</span>
                              <button onClick={() => removeItem(post.id, idx)} className="text-destructive hover:text-destructive/80 flex-shrink-0">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add item manually */}
                      {addingItem === post.id ? (
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            <select
                              value={newItem.category}
                              onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                              className="h-7 text-[10px] rounded border border-input bg-background px-1"
                            >
                              {Object.keys(CATEGORY_EMOJI).map(c => (
                                <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
                              ))}
                            </select>
                            <Input
                              placeholder="Brand"
                              value={newItem.brand}
                              onChange={e => setNewItem(prev => ({ ...prev, brand: e.target.value }))}
                              className="h-7 text-[10px]"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Input
                              placeholder="Model"
                              value={newItem.model}
                              onChange={e => setNewItem(prev => ({ ...prev, model: e.target.value }))}
                              className="h-7 text-[10px] flex-1"
                            />
                            <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => handleAddItem(post.id)}>Add</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={() => setAddingItem(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingItem(post.id)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add item manually
                        </button>
                      )}
                    </div>

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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
