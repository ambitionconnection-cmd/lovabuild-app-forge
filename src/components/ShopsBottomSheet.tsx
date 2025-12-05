import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Info, ChevronUp, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tables } from '@/integrations/supabase/types';
import haptic from '@/lib/haptics';

type ShopType = Tables<'shops_public'>;

type SheetState = 'peek' | 'expanded' | 'full';

interface ShopsBottomSheetProps {
  shops: ShopType[];
  visibleShops: ShopType[];
  onShopClick: (shop: ShopType) => void;
  onAddToJourney: (shop: ShopType) => void;
  onOpenDetails: (shop: ShopType) => void;
  isInJourney: (shopId: string) => boolean;
  selectedShopId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

const SHEET_HEIGHTS = {
  peek: 15,      // 15% of viewport
  expanded: 55,  // 55% of viewport
  full: 90,      // 90% of viewport
};

const SNAP_THRESHOLD = 30; // pixels needed to trigger snap to next state

export const ShopsBottomSheet: React.FC<ShopsBottomSheetProps> = ({
  shops,
  visibleShops,
  onShopClick,
  onAddToJourney,
  onOpenDetails,
  isInJourney,
  selectedShopId,
  userLocation,
  calculateDistance,
}) => {
  const [sheetState, setSheetState] = useState<SheetState>('peek');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentHeightRef = useRef(SHEET_HEIGHTS.peek);

  const shopsToDisplay = sheetState === 'full' ? shops : visibleShops;

  const getHeightPercent = () => {
    const baseHeight = SHEET_HEIGHTS[sheetState];
    if (isDragging) {
      // Convert drag offset to percentage
      const viewportHeight = window.innerHeight;
      const offsetPercent = (dragOffset / viewportHeight) * 100;
      return Math.max(10, Math.min(95, baseHeight - offsetPercent));
    }
    return baseHeight;
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    haptic.light();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    currentHeightRef.current = SHEET_HEIGHTS[sheetState];
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diff = clientY - startYRef.current;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const states: SheetState[] = ['peek', 'expanded', 'full'];
    const currentIndex = states.indexOf(sheetState);
    
    if (dragOffset < -SNAP_THRESHOLD) {
      // Dragging up - go to next state
      if (currentIndex < states.length - 1) {
        setSheetState(states[currentIndex + 1]);
        haptic.success();
      }
    } else if (dragOffset > SNAP_THRESHOLD) {
      // Dragging down - go to previous state
      if (currentIndex > 0) {
        setSheetState(states[currentIndex - 1]);
        haptic.light();
      }
    }
    
    setDragOffset(0);
  };

  // Add mouse event listeners for desktop dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientY - startYRef.current;
      setDragOffset(diff);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, sheetState]);

  const heightPercent = getHeightPercent();

  return (
    <div
      ref={sheetRef}
      className="lg:hidden fixed bottom-16 left-0 right-0 z-40 transition-all duration-300 ease-out"
      style={{
        height: `${heightPercent}vh`,
        transform: 'translateY(0)',
        touchAction: isDragging ? 'none' : 'auto',
      }}
    >
      <Card className="h-full flex flex-col bg-background/98 backdrop-blur-lg border-t-2 border-x border-directions/30 rounded-t-2xl shadow-2xl overflow-hidden">
        {/* Drag Handle Area */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center justify-center py-3">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
          
          {/* Header */}
          <div className="px-4 pb-3 flex items-center justify-between border-b border-directions/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-directions" />
              <span className="font-bold text-sm uppercase tracking-wider text-directions">
                {sheetState === 'full' ? 'All Shops' : 'Nearby'}
              </span>
              <Badge variant="secondary" className="text-xs bg-directions/10 text-directions border-directions/20">
                {shopsToDisplay.length}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ChevronUp className={`w-4 h-4 transition-transform ${sheetState === 'full' ? 'rotate-180' : ''}`} />
              <span className="hidden xs:inline">
                {sheetState === 'peek' ? 'Swipe up' : sheetState === 'expanded' ? 'More' : 'Swipe down'}
              </span>
            </div>
          </div>
        </div>

        {/* Shop List */}
        <ScrollArea className="flex-1 px-3">
          <div className="py-2 space-y-2">
            {shopsToDisplay.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MapPin className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No shops visible on map</p>
                <p className="text-xs mt-1">Zoom out or pan to see more</p>
              </div>
            ) : (
              shopsToDisplay.map((shop) => {
                const inJourney = isInJourney(shop.id);
                const isSelected = selectedShopId === shop.id;
                const distance = userLocation && shop.latitude && shop.longitude
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      Number(shop.latitude),
                      Number(shop.longitude)
                    )
                  : null;

                return (
                  <div
                    key={shop.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      inJourney
                        ? 'bg-directions/10 border-directions/40'
                        : isSelected
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-card border-border hover:border-directions/30'
                    }`}
                    onClick={() => onShopClick(shop)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate">{shop.name}</h4>
                          {inJourney && (
                            <Badge className="flex-shrink-0 bg-directions text-directions-foreground text-[10px] px-1.5 py-0">
                              In Journey
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {shop.address}, {shop.city}
                        </p>
                        {distance !== null && (
                          <p className="text-xs font-medium text-primary mt-1">
                            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} away
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails(shop);
                          }}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </Button>
                        {!inJourney && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-directions/10 hover:text-directions"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToJourney(shop);
                            }}
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default ShopsBottomSheet;
