import { Flame, MapPin, X, ExternalLink, ShoppingBag, ChevronLeft, ChevronRight, Download, Instagram, Archive } from "lucide-react";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { ShopThisFit } from "./ShopThisFit";

interface DetectedItem {
  category: string;
  brand: string;
  model: string;
  confidence: number;
}

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
  avatar_url: string | null;
  style_tags: string[];
  is_sponsored: boolean;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  is_pro: boolean;
  detected_items?: DetectedItem[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  official_website: string | null;
  affiliate_url?: string | null;
}

interface Props {
  post: Post;
  brands: Brand[];
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  posts?: Post[];
  onNavigate?: (post: Post) => void;
  onUserClick?: (userId: string) => void;
  onArchive?: (postId: string) => void;
}

const PostContent = ({ post, brands, onClose, onToggleLike, onPrev, onNext, hasPrev, hasNext, onUserClick, onArchive }: Props & { onPrev?: () => void; onNext?: () => void; hasPrev: boolean; hasNext: boolean; onUserClick?: (userId: string) => void; onArchive?: (postId: string) => void }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const handleDownload = async () => {
    try {
      const response = await fetch(post.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flyaf-spot-${post.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };
  const postBrands = brands.filter(b => post.brand_ids.includes(b.id));
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Only trigger if horizontal swipe is dominant and > 60px
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && hasNext && onNext) onNext();
      if (dx > 0 && hasPrev && onPrev) onPrev();
    }
  };

  return (
    <div
      ref={scrollRef}
      className="max-h-[85vh] overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image */}
      <div className="relative w-full bg-muted">
        <img
          src={post.image_url}
          alt={post.caption || "Street spotted"}
          className="w-full h-auto max-h-[60vh] object-contain bg-black"
        />
        {post.is_sponsored && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="text-[10px] bg-amber-500/90 text-white border-0">
              {t("hot.sponsored")}
            </Badge>
          </div>
        )}
        {/* Navigation arrows */}
        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Like + meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleLike(post.id)}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium transition-colors",
                post.user_liked ? "text-orange-400" : "text-muted-foreground hover:text-orange-400"
              )}
            >
              <Flame className={cn("w-5 h-5", post.user_liked && "fill-orange-400")} />
              {post.like_count > 0 && <span>{post.like_count}</span>}
            </button>
            {(isAdmin || (user && post.user_id === user.id)) && (
              <button onClick={handleDownload} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Download className="w-4 h-4" />
              </button>
            )}
            {isAdmin && onArchive && (
              <button
                onClick={() => onArchive(post.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                title="Archive (remove from feed)"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              onClick={() => onUserClick?.(post.user_id)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={post.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {post.display_name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium flex items-center gap-1">
                {post.display_name || "User"}
                {post.is_pro && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[8px] font-bold leading-none">PRO</span>
                )}
              </span>
            </button>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-foreground">{post.caption}</p>
        )}

        {/* Location */}
        {(post.city || post.country) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            {[post.city, post.country].filter(Boolean).join(", ")}
          </div>
        )}

        {/* Style tags */}
        {post.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.style_tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Brand tags */}
        {postBrands.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("hot.tagBrands")}</p>
            <div className="flex flex-wrap gap-2">
              {postBrands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => { onClose(); navigate(`/brand/${brand.slug}`); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
                >
                  {brand.logo_url && (
                    <img src={brand.logo_url} alt="" className="w-4 h-4 object-contain rounded-full" />
                  )}
                  {brand.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shop the Look */}
        {postBrands.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              {t("hot.shopTheLook")}
            </p>
            <div className="grid gap-2">
              {postBrands.map(brand => (
                <div key={brand.id} className="flex flex-wrap gap-1.5">
                  {(brand as any).affiliate_url && (
                    <a
                      href={(brand as any).affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      Shop {brand.name} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {brand.official_website && (
                    <a
                      href={brand.official_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                    >
                      {t("hot.visitStore")} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <a
                    href={`https://stockx.com/search?s=${encodeURIComponent(brand.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    StockX <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://www.goat.com/search?query=${encodeURIComponent(brand.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    GOAT <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* SHOP THIS FIT - AI detected items */}
        {post.detected_items && post.detected_items.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <ShopThisFit items={post.detected_items} />
          </div>
        )}
      </div>
    </div>
  );
};

export const StreetSpottedPostDetail = ({ post, brands, onClose, onToggleLike, posts = [], onNavigate, onUserClick }: Props) => {
  const isMobile = useIsMobile();

  const currentIndex = posts.findIndex(p => p.id === post.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < posts.length - 1 && currentIndex >= 0;

  const goToPrev = useCallback(() => {
    if (hasPrev && onNavigate) onNavigate(posts[currentIndex - 1]);
  }, [hasPrev, currentIndex, posts, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasNext && onNavigate) onNavigate(posts[currentIndex + 1]);
  }, [hasNext, currentIndex, posts, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  if (isMobile) {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <PostContent post={post} brands={brands} onClose={onClose} onToggleLike={onToggleLike} onPrev={goToPrev} onNext={goToNext} hasPrev={hasPrev} hasNext={hasNext} onUserClick={onUserClick} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <PostContent post={post} brands={brands} onClose={onClose} onToggleLike={onToggleLike} onPrev={goToPrev} onNext={goToNext} hasPrev={hasPrev} hasNext={hasNext} onUserClick={onUserClick} />
      </DialogContent>
    </Dialog>
  );
};
