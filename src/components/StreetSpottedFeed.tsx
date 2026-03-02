import { useState, useEffect, useCallback } from "react";
import { Plus, Flame, MapPin, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrands } from "@/hooks/useBrands";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import haptic from "@/lib/haptics";
import { StreetSpottedCreatePost } from "./StreetSpottedCreatePost";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  brand_ids: string[];
  like_count: number;
  user_liked: boolean;
  display_name: string | null;
}

export const StreetSpottedFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: brands = [] } = useBrands();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("street_spotted_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;
      if (!postsData?.length) { setPosts([]); setLoading(false); return; }

      const postIds = postsData.map(p => p.id);

      // Fetch brands and likes in parallel
      const [brandsRes, likesRes, userLikesRes, profilesRes] = await Promise.all([
        supabase.from("street_spotted_post_brands").select("post_id, brand_id").in("post_id", postIds),
        supabase.from("street_spotted_likes").select("post_id").in("post_id", postIds),
        user
          ? supabase.from("street_spotted_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        supabase.from("profiles").select("id, display_name").in("id", [...new Set(postsData.map(p => p.user_id))]),
      ]);

      const brandMap = new Map<string, string[]>();
      (brandsRes.data || []).forEach(b => {
        const arr = brandMap.get(b.post_id) || [];
        arr.push(b.brand_id);
        brandMap.set(b.post_id, arr);
      });

      const likeCountMap = new Map<string, number>();
      (likesRes.data || []).forEach(l => {
        likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
      });

      const userLikedSet = new Set((userLikesRes.data || []).map((l: any) => l.post_id));

      const profileMap = new Map<string, string>();
      (profilesRes.data || []).forEach((p: any) => {
        profileMap.set(p.id, p.display_name);
      });

      const enrichedPosts: Post[] = postsData.map(p => ({
        ...p,
        brand_ids: brandMap.get(p.id) || [],
        like_count: likeCountMap.get(p.id) || 0,
        user_liked: userLikedSet.has(p.id),
        display_name: profileMap.get(p.user_id) || null,
      }));

      setPosts(brandFilter
        ? enrichedPosts.filter(p => p.brand_ids.includes(brandFilter))
        : enrichedPosts
      );
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, [user, brandFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast.info("Sign in to like posts", {
        action: { label: "Sign In", onClick: () => navigate("/auth") },
      });
      return;
    }
    haptic.light();

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, user_liked: !p.user_liked, like_count: p.user_liked ? p.like_count - 1 : p.like_count + 1 }
        : p
    ));

    if (post.user_liked) {
      await supabase.from("street_spotted_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("street_spotted_likes").insert({ post_id: postId, user_id: user.id });
    }
  };

  const handlePostCreated = () => {
    setShowCreate(false);
    fetchPosts();
  };

  // Brand chips for filtering
  const usedBrandIds = [...new Set(posts.flatMap(p => p.brand_ids))];
  const filterBrands = brands.filter(b => usedBrandIds.includes(b.id));

  return (
    <div className="relative">
      {/* Brand filter chips */}
      {filterBrands.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 px-3 scrollbar-hide">
          <Badge
            variant={brandFilter === null ? "default" : "outline"}
            className="cursor-pointer flex-shrink-0 text-xs"
            onClick={() => setBrandFilter(null)}
          >
            All
          </Badge>
          {filterBrands.map(brand => (
            <Badge
              key={brand.id}
              variant={brandFilter === brand.id ? "default" : "outline"}
              className="cursor-pointer flex-shrink-0 text-xs whitespace-nowrap"
              onClick={() => setBrandFilter(brandFilter === brand.id ? null : brand.id)}
            >
              {brand.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Posts feed */}
      {loading ? (
        <div className="space-y-4 px-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl overflow-hidden">
              <Skeleton className="w-full aspect-[4/5]" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-2 text-foreground/70">No spots yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Be the first to share a streetwear sighting!
          </p>
          {user && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Post a Spot
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4 px-3">
          {posts.map(post => {
            const postBrands = brands.filter(b => post.brand_ids.includes(b.id));
            return (
              <div key={post.id} className="rounded-xl overflow-hidden bg-card border border-border/50">
                {/* Image */}
                <div className="relative w-full aspect-[4/5] bg-muted">
                  <img
                    src={post.image_url}
                    alt={post.caption || "Street spotted"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                    {/* Brand tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {postBrands.map(brand => (
                        <button
                          key={brand.id}
                          onClick={() => navigate(`/brand/${brand.slug}`)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
                        >
                          {brand.logo_url && (
                            <img src={brand.logo_url} alt="" className="w-3 h-3 object-contain rounded-full" />
                          )}
                          {brand.name}
                        </button>
                      ))}
                    </div>
                    {/* Location */}
                    {(post.city || post.country) && (
                      <div className="flex items-center gap-1 text-white/70 text-xs mb-1">
                        <MapPin className="w-3 h-3" />
                        {[post.city, post.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                        post.user_liked ? "text-orange-400" : "text-muted-foreground hover:text-orange-400"
                      }`}
                    >
                      <Flame className={`w-5 h-5 ${post.user_liked ? "fill-orange-400" : ""}`} />
                      {post.like_count > 0 && post.like_count}
                    </button>
                    {post.caption && (
                      <p className="text-xs text-muted-foreground truncate ml-2">{post.caption}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                    {post.display_name && <span className="font-medium">{post.display_name}</span>}
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating create button */}
      {user && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform lg:bottom-8"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Create post dialog */}
      {showCreate && (
        <StreetSpottedCreatePost
          onClose={() => setShowCreate(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};
