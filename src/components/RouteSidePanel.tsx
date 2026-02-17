import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Trash2, X, Save, Printer, Share2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type ShopType = Tables<'shops_public'>;

interface RouteSidePanelProps {
  journeyStops: ShopType[];
  onRemoveStop: (shopId: string) => void;
  onClearAll: () => void;
  onStartNavigation: () => void;
  onShopClick: (shop: ShopType) => void;
  userLocation: { lat: number; lng: number } | null;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

export const RouteSidePanel: React.FC<RouteSidePanelProps> = ({
  journeyStops,
  onRemoveStop,
  onClearAll,
  onStartNavigation,
  onShopClick,
  userLocation,
  calculateDistance,
}) => {
  return (
    <div className="hidden lg:flex absolute top-16 left-4 z-10 w-80 max-h-[calc(100vh-120px)] flex-col bg-background/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#C4956A]" />
            <span className="font-bold text-sm uppercase tracking-wider text-[#C4956A]">Route</span>
            <Badge variant="secondary" className="text-xs bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20">
              {journeyStops.length}
            </Badge>
          </div>
          {journeyStops.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs text-destructive hover:text-destructive/80 h-7 px-2"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-white/10"
            onClick={() => toast.info('Save feature coming soon')}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-white/10"
            onClick={() => toast.info('Print feature coming soon')}
          >
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-white/10"
            onClick={() => toast.info('Share feature coming soon')}
          >
            <Share2 className="w-3 h-3 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {/* Stops list */}
      <div className="flex-1 overflow-y-auto">
        {journeyStops.length === 0 ? (
          <div className="p-6 text-center">
            <Navigation className="w-8 h-8 text-[#C4956A]/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No stops yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click pins on the map to add shops to your route</p>
          </div>
        ) : (
          <div className="p-2">
            {userLocation && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                Your Location
              </div>
            )}
            {journeyStops.map((stop, index) => (
              <div
                key={stop.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer group"
                onClick={() => onShopClick(stop)}
              >
                <div className="w-5 h-5 rounded-full bg-[#C4956A]/20 text-[#C4956A] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{stop.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{stop.address}</p>
                  {stop.latitude && stop.longitude && userLocation && (
                    <p className="text-xs text-[#C4956A]">{calculateDistance(userLocation.lat, userLocation.lng, stop.latitude, stop.longitude).toFixed(1)} km away</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveStop(stop.id!);
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                >
                  <X className="w-3 h-3 text-white/60" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Navigation */}
      {journeyStops.length > 0 && (
        <div className="flex-shrink-0 p-3 border-t border-white/5">
          <Button
            onClick={onStartNavigation}
            className="w-full h-10 bg-[#C4956A] hover:bg-[#C4956A]/80 text-white font-semibold"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Start Navigation
          </Button>
        </div>
      )}
    </div>
  );
};