import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Navigation, Info, Search, X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";

type ShopType = Tables<'shops_public'>;

interface DesktopSidePanelProps {
  shops: ShopType[];
  visibleShops: ShopType[];
  onShopClick: (shop: ShopType) => void;
  onAddToJourney: (shop: ShopType) => void;
  onOpenDetails: (shop: ShopType) => void;
  isInJourney: (shopId: string) => boolean;
  selectedShopId?: string | null;
  highlightedShopId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  mapCenterLocation?: { lat: number; lng: number } | null;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DesktopSidePanel = ({
  shops,
  visibleShops,
  onShopClick,
  onAddToJourney,
  onOpenDetails,
  isInJourney,
  selectedShopId,
  highlightedShopId,
  userLocation,
  mapCenterLocation,
  calculateDistance,
  searchQuery,
  onSearchChange,
}: DesktopSidePanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Use visible shops, fallback to all shops
  const shopsToDisplay = visibleShops.length > 0 ? visibleShops : shops.slice(0, 20);

  const referenceLocation = mapCenterLocation || userLocation;

  // Sort by distance if we have a reference location
  const sortedShops = referenceLocation
    ? [...shopsToDisplay].sort((a, b) => {
        if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) return 0;
        const distA = calculateDistance(referenceLocation.lat, referenceLocation.lng, Number(a.latitude), Number(a.longitude));
        const distB = calculateDistance(referenceLocation.lat, referenceLocation.lng, Number(b.latitude), Number(b.longitude));
        return distA - distB;
      })
    : shopsToDisplay;

  const formatDistance = (distance: number) => {
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    if (distance < 10) return `${distance.toFixed(1)}km`;
    return `${Math.round(distance)}km`;
  };

  return (
    <div className="hidden lg:block absolute top-12 left-0 bottom-0 z-30">
      {/* Collapse/Expand toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-4 z-10 w-6 h-12 flex items-center justify-center bg-black/80 backdrop-blur-md border border-white/10 shadow-lg transition-all hover:bg-black/90 ${
          isCollapsed
            ? "left-0 rounded-r-lg"
            : "left-[340px] rounded-r-lg"
        }`}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-white" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-white" />
        )}
      </button>

      {/* Panel */}
      <div
        className={`h-full w-[340px] bg-black/90 backdrop-blur-xl border-r border-white/10 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md border border-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <h2 className="text-white font-bold tracking-wider text-sm uppercase">HEARDROP</h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <Input
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Shop count */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Nearby Shops
          </span>
          <Badge variant="secondary" className="bg-white/10 text-white/70 text-xs border-0">
            {sortedShops.length}
          </Badge>
        </div>

        {/* Shop list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sortedShops.map((shop) => {
              const inJourney = isInJourney(shop.id);
              const isSelected = selectedShopId === shop.id;
              const isHighlighted = highlightedShopId === shop.id;
              const distance = referenceLocation && shop.latitude && shop.longitude
                ? calculateDistance(
                    referenceLocation.lat,
                    referenceLocation.lng,
                    Number(shop.latitude),
                    Number(shop.longitude)
                  )
                : null;

              return (
                <div
                  key={shop.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    inJourney
                      ? "bg-white/10 border border-white/20"
                      : isSelected || isHighlighted
                      ? "bg-white/8 border border-white/15"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                  onClick={() => onShopClick(shop)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white text-sm font-semibold truncate">{shop.name}</h4>
                        {inJourney && (
                          <Badge className="flex-shrink-0 bg-white/20 text-white text-[9px] px-1.5 py-0 border-0">
                            In Route
                          </Badge>
                        )}
                      </div>
                      <p className="text-white/40 text-xs mt-0.5 truncate">
                        {shop.address}, {shop.city}
                      </p>
                      {distance !== null && (
                        <p className="text-white/60 text-xs font-medium mt-1">
                          {formatDistance(distance)}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(shop);
                        }}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </Button>

                      {!inJourney ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToJourney(shop);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <div className="h-7 w-7 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white/60" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};