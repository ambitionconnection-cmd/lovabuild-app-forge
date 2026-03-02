import { Flame, MapPin, X, ExternalLink, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";

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
}

const PostContent = ({ post, brands, onClose, onToggleLike }: Props) => {
  const navigate = useNavigate();
  const postBrands = brands.filter(b => post.brand_ids.includes(b.id));

  return (
    <div className="max-h-[85vh] overflow-y-auto">
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
              Sponsored
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Like + meta */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onToggleLike(post.id)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              post.user_liked ? "text-orange-400" : "text-muted-foreground hover:text-orange-400"
            )}
          >
            <Flame className={cn("w-5 h-5", post.user_liked && "fill-orange-400")} />
            {post.like_count > 0 && <span>{post.like_count} fire{post.like_count !== 1 ? "s" : ""}</span>}
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {post.display_name && <span className="font-medium">{post.display_name}</span>}
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
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tagged Brands</p>
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
              Shop the Look
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
                      {brand.name} Official <ExternalLink className="w-3 h-3" />
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
      </div>
    </div>
  );
};

export const StreetSpottedPostDetail = ({ post, brands, onClose, onToggleLike }: Props) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <PostContent post={post} brands={brands} onClose={onClose} onToggleLike={onToggleLike} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <PostContent post={post} brands={brands} onClose={onClose} onToggleLike={onToggleLike} />
      </DialogContent>
    </Dialog>
  );
};
