import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { MapPin, Navigation, Info, ExternalLink } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

type ShopType = Tables<'shops_public'>;

interface NearbyShopsSheetProps {
  shops: ShopType[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onShopClick: (shop: ShopType) => void;
  onAddToJourney: (shop: ShopType) => void;
  onRemoveFromJourney: (shopId: string) => void;
  onOpenDetails: (shop: ShopType) => void;
  isInJourney: (shopId: string) => boolean;
  journeyStops: ShopType[];
  selectedShop: ShopType | null;
  highlightedShopId: string | null;
  userLocation: { lat: number; lng: number } | null;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

export const NearbyShopsSheet = ({
  shops,
  isOpen,
  onOpenChange,
  onShopClick,
  onAddToJourney,
  onRemoveFromJourney,
  onOpenDetails,
  isInJourney,
  journeyStops,
  selectedShop,
  highlightedShopId,
  userLocation,
  calculateDistance,
}: NearbyShopsSheetProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="border-b border-directions/20 py-2 px-3">
          <DrawerTitle className="uppercase tracking-wider text-directions font-bold text-sm">
            📍 Nearby Shops
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            {shops.length} shop{shops.length !== 1 ? 's' : ''} found
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="overflow-y-auto p-2 space-y-1.5">
          {shops.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground text-sm">No shops found</p>
            </div>
          ) : (
            shops.map((shop) => {
              const inJourney = isInJourney(shop.id);
              const distance = userLocation && shop.latitude && shop.longitude
                ? calculateDistance(userLocation.lat, userLocation.lng, Number(shop.latitude), Number(shop.longitude))
                : null;
              
              return (
                <Card 
                  key={shop.id}
                  className={`cursor-pointer transition-all duration-200 border ${
                    inJourney
                      ? 'bg-directions/10 border-directions shadow-sm' 
                      : selectedShop?.id === shop.id 
                      ? 'bg-directions/5 border-directions/50' 
                      : highlightedShopId === shop.id
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'border-border'
                  }`}
                  onClick={() => !inJourney && onShopClick(shop)}
                >
                  <CardContent className="p-2">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-xs flex-1 truncate">{shop.name}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {distance !== null && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                          </span>
                        )}
                        {inJourney && (
                          <span className="text-[10px] bg-directions text-directions-foreground px-1.5 py-0.5 rounded-full font-bold">
                            #{journeyStops.findIndex(s => s.id === shop.id) + 1}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-1.5 truncate">
                      {shop.address}, {shop.city}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(shop);
                        }}
                        className="flex-1 h-6 text-[10px]"
                      >
                        <Info className="w-2.5 h-2.5 mr-0.5" />
                        Details
                      </Button>
                      {!inJourney ? (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-directions hover:bg-directions/90 text-directions-foreground h-6 text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToJourney(shop);
                          }}
                          disabled={!shop.latitude || !shop.longitude}
                        >
                          <Navigation className="w-2.5 h-2.5 mr-0.5" />
                          Add
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 h-6 text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromJourney(shop.id);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
