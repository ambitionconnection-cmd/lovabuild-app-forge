import { useState } from "react";
import { ShoppingBag, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface DetectedItem {
  category: string;
  brand: string;
  model: string;
  confidence: number;
}

interface Props {
  items: DetectedItem[];
  postId: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  hat: "🧢",
  cap: "🧢",
  top: "👕",
  jacket: "🧥",
  hoodie: "🧥",
  trousers: "👖",
  shorts: "🩳",
  shoes: "👟",
  sneakers: "👟",
  bag: "👜",
  scarf: "🧣",
  sunglasses: "🕶️",
  watch: "⌚",
  jewelry: "💎",
  other: "👔",
};

export const ShopThisFit = ({ items, postId }: Props) => {
  const [open, setOpen] = useState(false);

  if (!items || items.length === 0) return null;

  const buildSearchQuery = (item: DetectedItem) =>
    encodeURIComponent(`${item.brand} ${item.model}`);

  const trackClick = (item: DetectedItem, platform: "stockx" | "goat") => {
    // Fire-and-forget tracking
    supabase.functions.invoke("track-affiliate-analytics", {
      body: {
        event_type: "shop_this_fit_click",
        platform,
        post_id: postId,
        item_brand: item.brand,
        item_model: item.model,
        item_category: item.category,
      },
    }).catch(() => {});
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-0 py-2 group">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ShoppingBag className="w-4 h-4" />
          SHOP THIS FIT
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
            {items.length}
          </Badge>
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pb-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/30"
          >
            <span className="text-lg flex-shrink-0">
              {CATEGORY_EMOJI[item.category] || "👔"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {item.brand}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {item.model}
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <a
                href={`https://stockx.com/search?s=${buildSearchQuery(item)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors"
                onClick={e => { e.stopPropagation(); trackClick(item, "stockx"); }}
              >
                StockX <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a
                href={`https://www.goat.com/search?query=${buildSearchQuery(item)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-foreground text-[10px] font-semibold hover:bg-muted/80 transition-colors"
                onClick={e => { e.stopPropagation(); trackClick(item, "goat"); }}
              >
                GOAT <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
