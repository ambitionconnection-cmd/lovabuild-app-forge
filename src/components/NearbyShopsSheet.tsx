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
}: NearbyShopsSheetProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-directions/20">
          <DrawerTitle className="uppercase tracking-wider text-directions font-bold">
            📍 Nearby Shops
          </DrawerTitle>
          <DrawerDescription>
            {shops.length} shop{shops.length !== 1 ? 's' : ''} found
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="overflow-y-auto p-4 space-y-3">
          {shops.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No shops found</p>
            </div>
          ) : (
            shops.map((shop) => {
              const inJourney = isInJourney(shop.id);
              return (
                <Card 
                  key={shop.id}
                  className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-2 ${
                    inJourney
                      ? 'bg-directions/10 border-directions shadow-lg shadow-directions/20' 
                      : selectedShop?.id === shop.id 
                      ? 'bg-directions/5 border-directions/50' 
                      : highlightedShopId === shop.id
                      ? 'bg-primary/10 border-primary shadow-lg shadow-primary/20'
                      : 'border-border hover:border-directions/50'
                  }`}
                  onClick={() => !inJourney && onShopClick(shop)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold flex-1">{shop.name}</h3>
                      {inJourney && (
                        <span className="text-xs bg-directions text-directions-foreground px-2 py-1 rounded-full font-bold">
                          #{journeyStops.findIndex(s => s.id === shop.id) + 1}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{shop.address}, {shop.city}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(shop);
                        }}
                        className="flex-1"
                      >
                        <Info className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      {!inJourney ? (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-directions hover:bg-directions/90 text-directions-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToJourney(shop);
                          }}
                          disabled={!shop.latitude || !shop.longitude}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromJourney(shop.id);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                      {shop.official_site && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(shop.official_site!, '_blank');
                          }}
                          className="px-2"
                        >
                          <ExternalLink className="w-4 h-4" />
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
