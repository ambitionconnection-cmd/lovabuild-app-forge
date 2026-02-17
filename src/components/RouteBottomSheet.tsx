import React, { useState, useRef, useEffect } from 'react';
import { saveRoute, printRoute, shareRoute } from '@/lib/routeActions';
import { Navigation, Save, Printer, Share2, X, GripVertical, Trash2, MapPin, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import haptic from '@/lib/haptics';

type ShopType = Tables<'shops_public'>;
type SheetState = 'closed' | 'peek' | 'expanded' | 'full';

const SHEET_HEIGHTS = {
  closed: 0,
  peek: 12,
  expanded: 55,
  full: 90,
};
const SNAP_THRESHOLD = 50;

interface RouteBottomSheetProps {
  journeyStops: ShopType[];
  onRemoveStop: (shopId: string) => void;
  onClearAll: () => void;
  onStartNavigation: () => void;
  userLocation?: { lat: number; lng: number } | null;
  onShopClick: (shop: ShopType) => void;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  routeInfo?: { distance: number; duration: number; steps: any[] } | null;
}

export const RouteBottomSheet: React.FC<RouteBottomSheetProps> = ({
  journeyStops,
  onRemoveStop,
  onClearAll,
  onStartNavigation,
  userLocation,
  onShopClick,
  calculateDistance,
  routeInfo,
}) => {
  const [sheetState, setSheetState] = useState<SheetState>('peek');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);

  const getHeightPercent = () => {
    const baseHeight = SHEET_HEIGHTS[sheetState];
    if (isDragging) {
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

    if (offset < -SNAP_THRESHOLD && currentIndex < states.length - 1) {
      setSheetState(states[currentIndex + 1]);
      haptic.success();
    } else if (offset > SNAP_THRESHOLD && currentIndex > 0) {
      setSheetState(states[currentIndex - 1]);
      haptic.light();
    }

    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientY - startYRef.current;
      dragOffsetRef.current = diff;
      setDragOffset(diff);
    };
    const handleMouseUp = () => handleDragEnd();
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
    window.addEventListener('reopenRouteSheet', handleReopen);
    return () => window.removeEventListener('reopenRouteSheet', handleReopen);
  }, []);

  const heightPercent = getHeightPercent();

  const formatDistance = (distance: number) => {
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    if (distance < 10) return `${distance.toFixed(1)}km`;
    return `${Math.round(distance)}km`;
  };

  const handleSave = () => {
    saveRoute(journeyStops, userLocation);
  };
  const handlePrint = () => {
    printRoute(journeyStops, userLocation);
  };
  const handleShare = () => {
    shareRoute(journeyStops, userLocation);
  };

  return (
    <div
      className={`lg:hidden fixed left-0 right-0 z-40 pointer-events-none transition-all duration-300 ${sheetState === 'closed' ? 'translate-y-full' : ''}`}
      style={{
        height: `calc(${heightPercent}vh + 64px)`,
        bottom: 0,
        paddingBottom: '64px',
      }}
    >
      <Card
        className="h-full flex flex-col bg-background/98 backdrop-blur-lg border-t-2 border-x border-[#C4956A]/30 rounded-t-2xl shadow-2xl overflow-hidden pointer-events-auto"
        style={{ touchAction: isDragging ? 'none' : 'pan-y' }}
      >
        {/* Drag Handle */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center justify-center py-1.5">
            <div className="w-10 h-1 rounded-full bg-[#C4956A]/30" />
          </div>

          <div className="px-4 pb-2 flex items-center justify-between border-b border-[#C4956A]/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Navigation className="w-4 h-4 text-[#C4956A] flex-shrink-0" />
              <span className="font-bold text-sm uppercase tracking-wider text-[#C4956A]">
                Route
              </span>
              <Badge variant="secondary" className="text-xs bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20">
                {journeyStops.length}
              </Badge>
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
                {sheetState === 'peek' ? (
                  <ChevronUp className="w-3.5 h-3.5 text-white/60" />
                ) : (
                  <span className="text-xs text-white/60">✕</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-3">
          <div className="py-3 space-y-3">
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 border-white/10 text-white/60 hover:bg-white/5 text-xs h-8" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button variant="outline" size="sm" className="flex-1 border-white/10 text-white/60 hover:bg-white/5 text-xs h-8" onClick={handlePrint}>
                <Printer className="w-3 h-3 mr-1" /> Print
              </Button>
              <Button variant="outline" size="sm" className="flex-1 border-white/10 text-white/60 hover:bg-white/5 text-xs h-8" onClick={handleShare}>
                <Share2 className="w-3 h-3 mr-1" /> Share
              </Button>
            </div>

            {journeyStops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <Navigation className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/50 text-sm font-medium">No stops yet</p>
                <p className="text-white/30 text-xs mt-1">Tap shops on the map and add them to your route</p>
              </div>
            ) : (
              <>
                {/* Route summary */}
                {routeInfo && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-[#C4956A]/10 border border-[#C4956A]/20">
                    <div className="text-center flex-1">
                      <p className="text-[#C4956A] font-bold text-sm">{(routeInfo.distance / 1000).toFixed(1)}km</p>
                      <p className="text-white/40 text-[10px]">Distance</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center flex-1">
                      <p className="text-[#C4956A] font-bold text-sm">{Math.round(routeInfo.duration / 60)}min</p>
                      <p className="text-white/40 text-[10px]">Walking</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center flex-1">
                      <p className="text-[#C4956A] font-bold text-sm">{journeyStops.length}</p>
                      <p className="text-white/40 text-[10px]">Stops</p>
                    </div>
                  </div>
                )}

                {/* Your location */}
                {userLocation && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#AD3A49]/10 border border-[#AD3A49]/20">
                    <div className="w-6 h-6 rounded-full bg-[#AD3A49] flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-white/70 text-xs font-medium">Your Location</p>
                  </div>
                )}

                {/* Journey stops */}
                {journeyStops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8"
                    onClick={() => onShopClick(stop)}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C4956A]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C4956A] text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{stop.name}</p>
                      <p className="text-white/40 text-[10px] truncate">{stop.address}, {stop.city}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveStop(stop.id);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 flex-shrink-0"
                    >
                      <X className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                ))}

                {/* Start Navigation */}
                <Button
                  className="w-full bg-[#C4956A] hover:bg-[#C4956A]/90 text-white font-bold uppercase tracking-wider text-xs"
                  onClick={onStartNavigation}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Start Navigation
                </Button>

                {/* Clear all */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-white/30 hover:text-white/60 hover:bg-white/5 text-xs"
                  onClick={onClearAll}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear Route
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default RouteBottomSheet;