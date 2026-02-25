import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Globe, Instagram, MapPin, Navigation, Plus, ExternalLink } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type ShopType = Tables<'shops_public'>;

interface BrandType {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  history: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  official_website: string | null;
  country: string | null;
  category: string | null;
}

interface ShopDetailBottomSheetProps {
  shop: ShopType;
  brand: BrandType | null;
  onClose: () => void;
  onAddToJourney: (shop: ShopType) => void;
  onGetDirections: (shop: ShopType) => void;
  isInJourney: boolean;
  userLocation: { lat: number; lng: number } | null;
  calculateDistance: (lat: number, lng: number) => string;
}

const haptic = {
  light: () => { try { navigator.vibrate?.(10); } catch {} },
};

const ShopDetailBottomSheet: React.FC<ShopDetailBottomSheetProps> = ({
  shop,
  brand,
  onClose,
  onAddToJourney,
  onGetDirections,
  isInJourney,
  userLocation,
  calculateDistance,
}) => {
  const [sheetState, setSheetState] = useState<'expanded' | 'full'>('expanded');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const SHEET_HEIGHTS = { expanded: 55, full: 90 };

  const getHeightPercent = () => {
    const base = SHEET_HEIGHTS[sheetState];
    if (isDragging) {
      const offsetPercent = (dragOffset / window.innerHeight) * 100;
      return Math.max(10, Math.min(90, base - offsetPercent));
    }
    return base;
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 0) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    dragOffsetRef.current = 0;
    setIsDragging(true);
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const clientY = e.touches[0].clientY;
    const diff = clientY - startYRef.current;
    dragOffsetRef.current = diff;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const offset = dragOffsetRef.current;
    if (offset > 80) {
      // Swiped down — close
      onClose();
    } else if (offset < -50 && sheetState === 'expanded') {
      setSheetState('full');
    } else if (offset > 50 && sheetState === 'full') {
      setSheetState('expanded');
    }
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

  const heightPercent = getHeightPercent();
  const rawDistance = shop.latitude && shop.longitude && userLocation
    ? calculateDistance(shop.latitude, shop.longitude)
    : null;
  const distance = rawDistance && !rawDistance.includes('NaN') ? rawDistance : null;

  const bannerImage = brand?.banner_url || shop.image_url;
  const brandDescription = brand?.description || brand?.history;
  const shopDescription = shop.description;

  return (
    <div
      className="lg:hidden fixed left-0 right-0 z-50 pointer-events-none transition-all duration-300"
      style={{
        height: `calc(${heightPercent}vh + 64px)`,
        bottom: 0,
        paddingBottom: '64px',
      }}
    >
      <Card
        className="pointer-events-auto h-full flex flex-col bg-background/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {/* Drag handle + close */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/15" />
          </div>
        </div>

        {/* Sticky header - also draggable */}
        <div
          className="flex-shrink-0 px-4 py-2 flex items-center justify-between border-b border-white/5 bg-background/95 cursor-grab active:cursor-grabbing"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {brand?.logo_url && (
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden flex-shrink-0">
                <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[#C3C9C9] truncate">{shop.name}</h2>
              {brand && brand.name !== shop.name && <p className="text-xs text-muted-foreground truncate">{brand.name}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 ml-3"
          >
            <X className="w-4 h-4 text-[#A3A39E]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* Hero banner */}
          {bannerImage && (
            <div className="relative w-full h-40">
              <img
                src={bannerImage}
                alt={shop.name || ''}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </div>
          )}

          {/* Address + distance */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-[#AD3A49] flex-shrink-0" />
              <span>{shop.address}{shop.city ? `, ${shop.city}` : ''}</span>
            </div>
            {distance && (
              <p className="text-xs text-[#AD3A49] mt-1 ml-5.5">{distance} away</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 flex gap-2">
            <Button
              onClick={() => onAddToJourney(shop)}
              disabled={isInJourney}
              className={`flex-1 h-10 text-sm font-semibold ${
                isInJourney
                  ? 'bg-white/5 text-[#A3A39E] border border-white/10'
                  : 'bg-[#AD3A49] hover:bg-[#AD3A49]/80 text-white'
              }`}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {isInJourney ? 'Added' : 'Add to Route'}
            </Button>
            <Button
              onClick={() => onGetDirections(shop)}
              variant="outline"
              className="flex-1 h-10 text-sm font-semibold border-white/10 text-[#C3C9C9] hover:bg-white/5"
            >
              <Navigation className="w-4 h-4 mr-1.5" />
              Directions
            </Button>
          </div>

          {/* Category + country tags */}
          {(shop.category || brand?.country) && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {shop.category && (
                <Badge variant="secondary" className="text-xs bg-white/5 text-[#A3A39E] border-white/10">
                  {shop.category}
                </Badge>
              )}
              {brand?.country && (
                <Badge variant="secondary" className="text-xs bg-white/5 text-[#A3A39E] border-white/10">
                  🌍 {brand.country}
                </Badge>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="mx-4 border-t border-white/5 my-2" />

          {/* Brand description */}
          {brandDescription && (
            <div className="px-4 py-2">
              <h3 className="text-sm font-semibold text-[#C3C9C9] mb-1.5">About {brand?.name || 'the Brand'}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{brandDescription}</p>
            </div>
          )}

          {/* Shop description */}
          {shopDescription && shopDescription !== brandDescription && (
            <div className="px-4 py-2">
              <h3 className="text-sm font-semibold text-[#C3C9C9] mb-1.5">About this location</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{shopDescription}</p>
            </div>
          )}

          {/* External links */}
          <div className="px-4 py-3 flex flex-col gap-2">
            {brand?.official_website && (
              <a href={brand.official_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Globe className="w-4 h-4 text-[#C3C9C9]" />
                <span className="text-sm text-[#C3C9C9]">Official Website</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#A3A39E ml-auto" />
              </a>
            )}
            {shop.official_site && shop.official_site !== brand?.official_website && (
              <a href={shop.official_site} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Globe className="w-4 h-4 text-[#C3C9C9]" />
                <span className="text-sm text-[#C3C9C9]">Shop Website</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#A3A39E] ml-auto" />
              </a>
            )}
            {brand?.instagram_url && (
              <a href={brand.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Instagram className="w-4 h-4 text-[#C3C9C9]" />
                <span className="text-sm text-[#C3C9C9]">Instagram</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#A3A39E] ml-auto" />
              </a>
            )}
          </div>

          {/* Bottom padding for safe scroll */}
          <div className="h-8" />
        </div>
      </Card>
    </div>
  );
};

export default ShopDetailBottomSheet;