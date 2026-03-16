import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Plus, ShoppingBag, Save, Search, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { normalizeSearch } from "@/lib/utils";

interface DetectedItem {
  category: string;
  brand: string;
  model: string;
  confidence: number;
}

interface ApprovedPost {
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

export const ApprovedPostsManager = () => {
  const [posts, setPosts] = useState<ApprovedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItems, setEditingItems] = useState<Record<string, DetectedItem[]>>({});
  const [savingPost, setSavingPost] = useState<string | null>(null);
  const [detectingPost, setDetectingPost] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ category: "other", brand: "", model: "" });
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchApproved = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("street_spotted_posts")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching approved posts:", error);
      toast.error("Failed to load approved posts");
    }
    const postsData = (data as any[]) || [];
    setPosts(postsData.map(p => ({
      ...p,
      detected_items: p.detected_items || [],
    })));
    const itemsMap: Record<string, DetectedItem[]> = {};
    postsData.forEach(p => { itemsMap[p.id] = p.detected_items || []; });
    setEditingItems(prev => ({ ...prev, ...itemsMap }));
    setLoading(false);
  };

  useEffect(() => { fetchApproved(); }, [page]);

  const detectItems = async (post: ApprovedPost) => {
    setDetectingPost(post.id);
    try {
      const response = await supabase.functions.invoke("detect-outfit-items", {
        body: { postId: post.id, imageUrl: post.image_url },
      });
      if (response.error) throw response.error;
      const items: DetectedItem[] = response.data?.items || [];
      setEditingItems(prev => ({ ...prev, [post.id]: items }));
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

  const saveItems = async (postId: string) => {
    setSavingPost(postId);
    const items = editingItems[postId] || [];
    const { error } = await supabase
      .from("street_spotted_posts")
      .update({ detected_items: items } as any)
      .eq("id", postId);

    if (error) {
      toast.error("Failed to save changes");
      console.error(error);
    } else {
      toast.success("Items updated ✅");
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, detected_items: items } : p));
    }
    setSavingPost(null);
  };

  const hasChanges = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return false;
    return JSON.stringify(editingItems[postId]) !== JSON.stringify(post.detected_items);
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const q = normalizeSearch(searchQuery);
    return normalizeSearch(post.caption || '').includes(q) ||
           normalizeSearch(post.city || '').includes(q) ||
           normalizeSearch(post.country || '').includes(q) ||
           (editingItems[post.id] || []).some(item =>
             normalizeSearch(item.brand).includes(q) || normalizeSearch(item.model).includes(q)
           );
  });

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
          <ShoppingBag className="h-5 w-5" />
          Manage Approved Posts — Shop This Fit
        </CardTitle>
        <CardDescription>
          Edit detected items on approved posts. Changes are saved individually per post.
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by caption, city, brand..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredPosts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No approved posts found</p>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map(post => {
              const items = editingItems[post.id] || [];
              const isExpanded = expandedPost === post.id;
              const changed = hasChanges(post.id);

              return (
                <div key={post.id} className="rounded-xl border border-border overflow-hidden bg-card">
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                  >
                    <img
                      src={post.image_url}
                      alt={post.caption || "Post"}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.caption || "No caption"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {post.city && <span>{post.city}</span>}
                        {post.country && <span>{post.country}</span>}
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </Badge>
                      {changed && <Badge className="text-[10px] bg-amber-500">unsaved</Badge>}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" /> Detected Items
                        </span>
                        <div className="flex gap-1">
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
                          {changed && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] gap-1 px-2"
                              onClick={() => saveItems(post.id)}
                              disabled={savingPost === post.id}
                            >
                              {savingPost === post.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Save
                            </Button>
                          )}
                        </div>
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
                  )}
                </div>
              );
            })}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground self-center">Page {page + 1}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={posts.length < PAGE_SIZE}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
