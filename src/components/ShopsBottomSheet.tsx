import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Navigation, Info, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tables } from '@/integrations/supabase/types';
import haptic from '@/lib/haptics';

type ShopType = Tables<'shops_public'>;

type SheetState = 'closed' | 'peek' | 'expanded' | 'full';

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
  mapCenterLocation?: { lat: number; lng: number } | null;
  isLoadingLocation?: boolean;
}

const SHEET_HEIGHTS = {
  closed: 0,
  peek: 15,
  expanded: 55,
  full: 90,
};

const SNAP_THRESHOLD = 50; // pixels needed to trigger snap to next state

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
  mapCenterLocation,
  isLoadingLocation = false,
}) => {
  const [sheetState, setSheetState] = useState<SheetState>('peek');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentHeightRef = useRef(SHEET_HEIGHTS.peek);
  const dragOffsetRef = useRef(0);

  // Calculate shops to display based on map center or visible shops
  // CRITICAL FIX #1: Always show at least the closest shops, never show empty
  const shopsToDisplay = useMemo(() => {
    // Full mode shows all shops
    if (sheetState === 'full') {
      return shops;
    }
    
    const referenceLocation = mapCenterLocation || userLocation;
    const validShops = shops.filter(shop => shop.latitude && shop.longitude);
    
    // If we have visible shops from the map viewport, prioritize them
    if (visibleShops && visibleShops.length > 0) {
      // Sort visible shops by distance from reference location if available
      if (referenceLocation) {
        return [...visibleShops].sort((a, b) => {
          if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) return 0;
          const distA = calculateDistance(
            referenceLocation.lat,
            referenceLocation.lng,
            Number(a.latitude),
            Number(a.longitude)
          );
          const distB = calculateDistance(
            referenceLocation.lat,
            referenceLocation.lng,
            Number(b.latitude),
            Number(b.longitude)
          );
          return distA - distB;
        });
      }
      return visibleShops;
    }
    
    // FALLBACK: If no visible shops (e.g., user is far from any shops), 
    // find the closest shops to map center or user location
    if (referenceLocation && validShops.length > 0) {
      const shopsWithDistance = validShops.map(shop => ({
        shop,
        distance: calculateDistance(
          referenceLocation.lat,
          referenceLocation.lng,
          Number(shop.latitude),
          Number(shop.longitude)
        )
      })).sort((a, b) => a.distance - b.distance);
      
      // Return at least the 10 closest shops when no visible shops in viewport
      return shopsWithDistance.slice(0, 10).map(item => item.shop);
    }
    
    // ULTIMATE FALLBACK: If no location available at all, show first 10 shops
    if (validShops.length > 0) {
      return validShops.slice(0, 10);
    }
    
    return [];
  }, [sheetState, shops, visibleShops, mapCenterLocation, userLocation, calculateDistance]);

  // Get the closest shop for the header display
  const closestShop = useMemo(() => {
    const referenceLocation = mapCenterLocation || userLocation;
    if (!referenceLocation || shopsToDisplay.length === 0) return null;
    
    let closest = shopsToDisplay[0];
    let closestDistance = Infinity;
    
    for (const shop of shopsToDisplay) {
      if (!shop.latitude || !shop.longitude) continue;
      const distance = calculateDistance(
        referenceLocation.lat,
        referenceLocation.lng,
        Number(shop.latitude),
        Number(shop.longitude)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = shop;
      }
    }
    
    return { shop: closest, distance: closestDistance };
  }, [shopsToDisplay, mapCenterLocation, userLocation, calculateDistance]);

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
    dragOffsetRef.current = diff;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const offset = dragOffsetRef.current;
    const states: SheetState[] = ['closed', 'peek', 'expanded', 'full'];
    const currentIndex = states.indexOf(sheetState);

    // Use drag direction and distance to decide
    if (offset < -SNAP_THRESHOLD && currentIndex < states.length - 1) {
      // Dragged UP — go one state higher
      setSheetState(states[currentIndex + 1]);
      haptic.success();
    } else if (offset > SNAP_THRESHOLD && currentIndex > 0) {
      // Dragged DOWN — go one state lower
      setSheetState(states[currentIndex - 1]);
      haptic.light();
    }
    // Otherwise stay in current state

    dragOffsetRef.current = 0;
    setDragOffset(0);
  };
  // Add mouse event listeners for desktop dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientY - startYRef.current;
      dragOffsetRef.current = diff;
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

  // Listen for reopen event from tab bar
  useEffect(() => {
    const handleReopen = () => {
      setSheetState('peek');
      haptic.light();
    };
    window.addEventListener('reopenShopsSheet', handleReopen);
    return () => window.removeEventListener('reopenShopsSheet', handleReopen);
  }, []);
  const heightPercent = getHeightPercent();

  // Format distance for display
  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  };

  return (
    <div
      ref={sheetRef}
      className={`lg:hidden fixed left-0 right-0 z-40 pointer-events-none transition-all duration-300 ${sheetState === 'closed' ? 'translate-y-full' : ''}`}
      style={{
        height: `calc(${heightPercent}vh + 64px)`,
        bottom: 0,
        paddingBottom: '64px',
      }}
    >
      <Card
        className="h-full flex flex-col bg-background/98 backdrop-blur-lg border-t-2 border-x border-directions/30 rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto"
        style={{ touchAction: isDragging ? 'none' : 'pan-y' }}
      >
        {/* Drag Handle Area */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center justify-center py-1.5">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          
          {/* Header - CRITICAL FIX #1: Show closest shop info when peek state */}
          <div className="px-4 pb-2 flex items-center justify-between border-b border-directions/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-directions flex-shrink-0" />
              {sheetState === 'peek' && closestShop ? (
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm uppercase tracking-wider text-directions">
                    Closest Shop
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    {closestShop.shop.name} ({formatDistance(closestShop.distance)})
                  </p>
                </div>
              ) : (
                <>
                  <span className="font-bold text-sm uppercase tracking-wider text-directions">
                    {sheetState === 'full' ? 'All Shops' : 'Nearby'}
                  </span>
                  <Badge variant="secondary" className="text-xs bg-directions/10 text-directions border-directions/20">
                    {shopsToDisplay.length}
                  </Badge>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (sheetState === 'closed' || sheetState === 'peek') {
                    setSheetState('expanded');
                  } else {
                    setSheetState('closed');
                  }
                  haptic.light();
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {sheetState === 'closed' || sheetState === 'peek' ? (
                  <ChevronUp className="w-3.5 h-3.5 text-white/60" />
                ) : (
                  <span className="text-xs text-white/60">✕</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Shop List */}
        <ScrollArea className="flex-1 px-3">
          <div className="py-2 space-y-2">
            {isLoadingLocation ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <div className="flex gap-1.5">
                        <Skeleton className="h-7 w-7 rounded" />
                        <Skeleton className="h-7 w-7 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-center text-muted-foreground mt-2">Getting your location...</p>
              </div>
            ) : shopsToDisplay.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MapPin className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Pan the map to discover shops</p>
                <p className="text-xs mt-1">Shops will appear as you explore</p>
              </div>
            ) : (
              shopsToDisplay.map((shop) => {
                const inJourney = isInJourney(shop.id);
                const isSelected = selectedShopId === shop.id;
                // Calculate distance from map center (for viewport-based) or user location
                const referenceLocation = mapCenterLocation || userLocation;
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
                            {formatDistance(distance)} away
                          </p>
                        )}
                      </div>
                      
                      <TooltipProvider delayDuration={300}>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
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
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              View Details
                            </TooltipContent>
                          </Tooltip>
                          
                          {shop.latitude && shop.longitude && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-green-500/10 hover:text-green-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptic.light();
                                    // Detect iOS vs Android/other and open appropriate maps app
                                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                                    const destination = `${shop.latitude},${shop.longitude}`;
                                    const url = isIOS
                                      ? `maps://maps.apple.com/?daddr=${destination}&dirflg=d`
                                      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
                                    window.open(url, '_blank');
                                  }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Get Directions
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {!inJourney && (
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Add to Journey
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
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
