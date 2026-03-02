import { useState, useEffect } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/BrandLogo";
import { formatDistanceToNow } from "date-fns";

interface RadarItem {
  id: string;
  brand_id: string;
  title: string;
  summary: string | null;
  source_url: string;
  thumbnail_url: string | null;
  source_name: string | null;
  published_at: string | null;
  created_at: string;
}

export const BrandRadarFeed = () => {
  const { data: brands = [] } = useBrands();
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      let query = supabase
        .from("brand_radar_items")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (brandFilter) {
        query = query.eq("brand_id", brandFilter);
      }

      const { data, error } = await query;
      if (error) console.error("Error fetching radar items:", error);
      setItems(data || []);
      setLoading(false);
    };
    fetchItems();
  }, [brandFilter]);

  // Get brands that have radar items
  const usedBrandIds = [...new Set(items.map(i => i.brand_id))];
  const filterBrands = brands.filter(b => usedBrandIds.includes(b.id));

  return (
    <div>
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

      {/* Items */}
      {loading ? (
        <div className="space-y-3 px-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/30">
              <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-2 text-foreground/70">No news yet</h3>
          <p className="text-sm text-muted-foreground">
            Brand news will appear here automatically once the daily feed is set up.
          </p>
        </div>
      ) : (
        <div className="space-y-2 px-3">
          {items.map(item => {
            const brand = brands.find(b => b.id === item.brand_id);
            const timeAgo = item.published_at
              ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
              : formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

            return (
              <a
                key={item.id}
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-colors group"
              >
                {/* Thumbnail or brand logo */}
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : brand?.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="w-10 h-10 object-contain" />
                  ) : (
                    <Newspaper className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    {brand && <span className="font-medium text-foreground/70">{brand.name}</span>}
                    {item.source_name && <><span>·</span><span>{item.source_name}</span></>}
                    <span>·</span>
                    <span>{timeAgo}</span>
                    <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
