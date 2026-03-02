import { useState, useEffect, useCallback } from "react";
import { Plus, Flame, MapPin, Camera, ExternalLink, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrands } from "@/hooks/useBrands";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import haptic from "@/lib/haptics";
import { StreetSpottedCreatePost } from "./StreetSpottedCreatePost";
import { StreetSpottedPostDetail } from "./StreetSpottedPostDetail";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
  style_tags: string[];
  is_sponsored: boolean;
}

const STYLE_TAG_OPTIONS = [
  "streetwear", "techwear", "vintage", "minimalist", "y2k",
  "gorpcore", "workwear", "avant-garde", "skate", "luxury",
  "casual", "sportswear", "grunge", "preppy"
];

export const StreetSpottedFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: brands = [] } = useBrands();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Filters
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [showTrending, setShowTrending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("street_spotted_posts")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);

      if (postsError) throw postsError;
      if (!postsData?.length) { setPosts([]); setLoading(false); return; }

      const postIds = postsData.map(p => p.id);

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
        style_tags: (p as any).style_tags || [],
        is_sponsored: (p as any).is_sponsored || false,
      }));

      setPosts(enrichedPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  // Apply filters
  let filteredPosts = posts;

  // Sponsored posts pinned at top
  const sponsoredPosts = filteredPosts.filter(p => p.is_sponsored);
  const regularPosts = filteredPosts.filter(p => !p.is_sponsored);

  if (brandFilter) {
    filteredPosts = [...sponsoredPosts, ...regularPosts].filter(p => p.brand_ids.includes(brandFilter));
  } else {
    filteredPosts = [...sponsoredPosts, ...regularPosts];
  }

  if (countryFilter) {
    filteredPosts = filteredPosts.filter(p => p.country === countryFilter);
  }
  if (cityFilter) {
    filteredPosts = filteredPosts.filter(p => p.city === cityFilter);
  }
  if (styleFilter) {
    filteredPosts = filteredPosts.filter(p => p.style_tags.includes(styleFilter));
  }
  if (showTrending) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    filteredPosts = filteredPosts
      .filter(p => new Date(p.created_at) >= sevenDaysAgo)
      .sort((a, b) => b.like_count - a.like_count);
  }

  // Get unique filter values from posts
  const usedBrandIds = [...new Set(posts.flatMap(p => p.brand_ids))];
  const filterBrands = brands.filter(b => usedBrandIds.includes(b.id));
  const countries = [...new Set(posts.map(p => p.country).filter(Boolean))] as string[];
  const cities = [...new Set(posts.map(p => p.city).filter(Boolean))] as string[];
  const usedStyles = [...new Set(posts.flatMap(p => p.style_tags))];

  // Trending posts for carousel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trendingPosts = posts
    .filter(p => new Date(p.created_at) >= sevenDaysAgo && p.like_count > 0)
    .sort((a, b) => b.like_count - a.like_count)
    .slice(0, 5);

  const hasActiveFilters = brandFilter || countryFilter || cityFilter || styleFilter || showTrending;

  return (
    <div className="relative">
      {/* Trending carousel */}
      {trendingPosts.length > 0 && !hasActiveFilters && (
        <div className="px-3 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            Trending This Week
          </h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {trendingPosts.map(post => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="flex-shrink-0 w-28 rounded-lg overflow-hidden relative group"
              >
                <img
                  src={post.image_url}
                  alt={post.caption || "Trending"}
                  className="w-full h-36 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 text-white text-[10px] font-medium">
                  <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />
                  {post.like_count}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="sticky top-[49px] lg:top-[105px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/30 px-3 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              hasActiveFilters
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="w-3 h-3" />
            Filter
          </button>

          <Badge
            variant={showTrending ? "default" : "outline"}
            className="cursor-pointer flex-shrink-0 text-xs"
            onClick={() => setShowTrending(!showTrending)}
          >
            🔥 Trending
          </Badge>

          {filterBrands.slice(0, 6).map(brand => (
            <Badge
              key={brand.id}
              variant={brandFilter === brand.id ? "default" : "outline"}
              className="cursor-pointer flex-shrink-0 text-xs whitespace-nowrap"
              onClick={() => setBrandFilter(brandFilter === brand.id ? null : brand.id)}
            >
              {brand.name}
            </Badge>
          ))}

          {hasActiveFilters && (
            <button
              onClick={() => {
                setBrandFilter(null);
                setCountryFilter(null);
                setCityFilter(null);
                setStyleFilter(null);
                setShowTrending(false);
              }}
              className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="mt-2 pt-2 border-t border-border/30 space-y-2">
            {/* Style tags */}
            {usedStyles.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Style</p>
                <div className="flex flex-wrap gap-1">
                  {usedStyles.map(style => (
                    <Badge
                      key={style}
                      variant={styleFilter === style ? "default" : "outline"}
                      className="cursor-pointer text-[10px]"
                      onClick={() => setStyleFilter(styleFilter === style ? null : style)}
                    >
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {/* Country */}
            {countries.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Country</p>
                <div className="flex flex-wrap gap-1">
                  {countries.map(c => (
                    <Badge
                      key={c}
                      variant={countryFilter === c ? "default" : "outline"}
                      className="cursor-pointer text-[10px]"
                      onClick={() => setCountryFilter(countryFilter === c ? null : c)}
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {/* City */}
            {cities.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">City</p>
                <div className="flex flex-wrap gap-1">
                  {cities.slice(0, 10).map(c => (
                    <Badge
                      key={c}
                      variant={cityFilter === c ? "default" : "outline"}
                      className="cursor-pointer text-[10px]"
                      onClick={() => setCityFilter(cityFilter === c ? null : c)}
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Posts masonry grid */}
      {loading ? (
        <div className="columns-2 lg:columns-3 gap-2 px-3 pt-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="break-inside-avoid mb-2">
              <Skeleton className="w-full rounded-xl" style={{ height: `${180 + (i % 3) * 60}px` }} />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
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
        <div className="columns-2 lg:columns-3 gap-2 px-3 pt-3">
          {filteredPosts.map(post => {
            const postBrands = brands.filter(b => post.brand_ids.includes(b.id));
            return (
              <div
                key={post.id}
                className="break-inside-avoid mb-2 rounded-xl overflow-hidden bg-card border border-border/50 cursor-pointer group relative"
                onClick={() => setSelectedPost(post)}
              >
                {/* Sponsored badge */}
                {post.is_sponsored && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="secondary" className="text-[9px] bg-amber-500/90 text-white border-0 backdrop-blur-sm">
                      Sponsored
                    </Badge>
                  </div>
                )}

                {/* Image — natural aspect ratio */}
                <div className="relative w-full bg-muted">
                  <img
                    src={post.image_url}
                    alt={post.caption || "Street spotted"}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  {/* Hover overlay (desktop) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity lg:block hidden">
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {postBrands.slice(0, 3).map(brand => (
                          <span key={brand.id} className="px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium">
                            {brand.name}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-white text-xs">
                        <Flame className={cn("w-3.5 h-3.5", post.like_count > 0 && "fill-orange-400 text-orange-400")} />
                        {post.like_count}
                      </div>
                    </div>
                  </div>

                  {/* Mobile: always-visible overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6 lg:hidden">
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {postBrands.slice(0, 2).map(brand => (
                        <span key={brand.id} className="px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[9px] font-medium">
                          {brand.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex items-center justify-between p-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium transition-colors",
                      post.user_liked ? "text-orange-400" : "text-muted-foreground hover:text-orange-400"
                    )}
                  >
                    <Flame className={cn("w-4 h-4", post.user_liked && "fill-orange-400")} />
                    {post.like_count > 0 && post.like_count}
                  </button>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {(post.city || post.country) && (
                      <>
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[60px]">{post.city || post.country}</span>
                      </>
                    )}
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

      {/* Post detail drawer */}
      {selectedPost && (
        <StreetSpottedPostDetail
          post={selectedPost}
          brands={brands}
          onClose={() => setSelectedPost(null)}
          onToggleLike={toggleLike}
        />
      )}
    </div>
  );
};
