import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Trash2, X, Save, Printer, Share2, GripVertical, Lock, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { saveRoute, printRoute, shareRoute } from '@/lib/routeActions';
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
  onReorderStops?: (stops: ShopType[]) => void;
}

const SortableSidePanelStop = ({ stop, index, onRemove, onShopClick, userLocation, calculateDistance }: {
  stop: ShopType; index: number; onRemove: (id: string) => void; onShopClick: (shop: ShopType) => void;
  userLocation: { lat: number; lng: number } | null;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id! });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer group ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}`}
      onClick={() => onShopClick(stop)}
    >
      <button className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
        <GripVertical className="w-3 h-3 text-[#C4956A]" />
      </button>
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
        onClick={(e) => { e.stopPropagation(); onRemove(stop.id!); }}
        className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
      >
        <X className="w-3 h-3 text-white/60" />
      </button>
    </div>
  );
};

export const RouteSidePanel: React.FC<RouteSidePanelProps> = ({
  journeyStops,
  onRemoveStop,
  onClearAll,
  onStartNavigation,
  onShopClick,
  userLocation,
  calculateDistance,
  onReorderStops,
}) => {
  const { isPro } = useAuth();
  const { t } = useTranslation();
  const [showProModal, setShowProModal] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  return (
    <>
    <div className="hidden lg:flex absolute top-16 left-4 z-10 w-80 max-h-[calc(100vh-120px)] flex-col bg-background/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#C4956A]" />
            <span className="font-bold text-sm uppercase tracking-wider text-[#C4956A]">{t('route.title')}</span>
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
              {t('route.clear')}
            </Button>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-white/10"
            onClick={async () => {
              const result = await saveRoute(journeyStops, userLocation, isPro);
              if (result === 'limit_reached') setShowProModal(true);
              else if (result === 'sign_in_required') {
                toast.info('Sign in to save your routes', {
                  action: { label: 'Sign In', onClick: () => window.location.href = '/auth' },
                });
              }
            }}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 h-8 text-xs border-white/10 ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => { if (!isPro) { setShowProModal(true); } else { printRoute(journeyStops, userLocation); } }}
          >
            {isPro ? <Printer className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
            Print
            {!isPro && <span className="ml-1 px-1 py-px rounded bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[7px] font-bold leading-none">PRO</span>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-white/10"
            onClick={() => shareRoute(journeyStops, userLocation)}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (over && active.id !== over.id && onReorderStops) {
                  const oldIndex = journeyStops.findIndex(s => s.id === active.id);
                  const newIndex = journeyStops.findIndex(s => s.id === over.id);
                  const newStops = [...journeyStops];
                  const [moved] = newStops.splice(oldIndex, 1);
                  newStops.splice(newIndex, 0, moved);
                  onReorderStops(newStops);
                }
              }}
            >
              <SortableContext items={journeyStops.map(s => s.id!)} strategy={verticalListSortingStrategy}>
                {journeyStops.map((stop, index) => (
                  <SortableSidePanelStop
                    key={stop.id}
                    stop={stop}
                    index={index}
                    onRemove={onRemoveStop}
                    onShopClick={onShopClick}
                    userLocation={userLocation}
                    calculateDistance={calculateDistance}
                  />
                ))}
              </SortableContext>
            </DndContext>
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
    <ProUpgradeModal open={showProModal} onOpenChange={setShowProModal} trigger="routes" />
    </>
  );
};