import { DesktopSidePanel } from "@/components/DesktopSidePanel";
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, MapPin, Navigation, GripVertical, Info, Maximize2, Minimize2, Filter, X, Plus, Check, Move } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Map from "@/components/Map";
import { ShopDetailsModal } from "@/components/ShopDetailsModal";
import { ShopsBottomSheet } from "@/components/ShopsBottomSheet";
import { RouteBottomSheet } from "@/components/RouteBottomSheet";
import ShopDetailBottomSheet from "@/components/ShopDetailBottomSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import haptic from "@/lib/haptics";
import { useDebounce } from "@/hooks/useDebounce";
import { useShopsCache } from "@/hooks/useShopsCache";
import { CityChip } from "@/components/CityChip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ShopType = Tables<'shops_public'>;

interface SortableStopProps {
  stop: ShopType;
  index: number;
  onRemove: (id: string) => void;
}

const SortableStop = ({ stop, index, onRemove }: SortableStopProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

    return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 p-1 bg-background/50 rounded border border-directions/20 transition-all ${
        isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : ''
      }`}
    >
      <button
        className="flex-shrink-0 cursor-grab active:cursor-grabbing hover:bg-directions/10 p-0.5 rounded transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3 text-directions" />
      </button>
      <div className="flex-shrink-0 w-4 h-4 rounded-full bg-directions text-directions-foreground flex items-center justify-center text-[10px] font-bold">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold truncate">{stop.name}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(stop.id)}
        className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="w-2.5 h-2.5" />
      </Button>
    </div>
  );
};

const Directions = () => {
  const [searchParams] = useSearchParams();
  const [isRouteMode, setIsRouteMode] = useState(searchParams.get('mode') === 'route');
  const navigate = useNavigate();

  // Listen for mode switches from tab bar (no remount)
  useEffect(() => {
    const handleRouteMode = () => {
      setIsRouteMode(true);
    };
    const handleMapMode = () => {
      setIsRouteMode(false);
    };
    window.addEventListener('switchToRouteMode', handleRouteMode);
    window.addEventListener('reopenShopsSheet', handleMapMode);
    return () => {
      window.removeEventListener('switchToRouteMode', handleRouteMode);
      window.removeEventListener('reopenShopsSheet', handleMapMode);
    };
  }, []);

  const [shops, setShops] = useState<ShopType[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedShop, setSelectedShop] = useState<ShopType | null>(null);
  const [journeyStops, setJourneyStops] = useState<ShopType[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedShopForDetails, setSelectedShopForDetails] = useState<ShopType | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [highlightedShopId, setHighlightedShopId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenterLocation, setMapCenterLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [visibleShops, setVisibleShops] = useState<ShopType[]>([]);
  const [brands, setBrands] = useState<{ id: string; slug: string; name: string; logo_url: string | null; banner_url: string | null; description: string | null; history: string | null; instagram_url: string | null; tiktok_url: string | null; official_website: string | null; country: string | null; category: string | null }[]>([]);

  // Listen for pin tap on mobile to open shop detail
  useEffect(() => {
    const handleOpenShopDetail = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const shop = shops.find(s => s.id === detail.shopId);
      if (shop) {
        setSelectedShopForDetails(shop);
      }
    };
    window.addEventListener('map:openShopDetail', handleOpenShopDetail);
    return () => window.removeEventListener('map:openShopDetail', handleOpenShopDetail);
  }, [shops]);

  // Draggable journey panel state
  const [journeyPanelPosition, setJourneyPanelPosition] = useState({ x: 8, y: 0 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelStartPos = useRef({ x: 0, y: 0 });

  // Debounce search query for optimized geocoding
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Cache for shops and routes
  const { getCachedShops, setCachedShops, getCachedRoute, setCachedRoute } = useShopsCache();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Get user's location with HIGH ACCURACY
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Geolocation success - accuracy:', position.coords.accuracy, 'meters');
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setSortByDistance(true); // Auto-enable distance sorting when location is available
        },
        (error) => {
          console.error('📍 Geolocation error:', error.code, error.message);
          // Fallback: try again without high accuracy if it fails
          if (error.code === error.TIMEOUT) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('📍 Geolocation fallback success - accuracy:', position.coords.accuracy, 'meters');
                setUserLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
                setSortByDistance(true);
              },
              (fallbackError) => {
                console.error('📍 Geolocation fallback also failed:', fallbackError.message);
              },
              { enableHighAccuracy: false, timeout: 10000 }
            );
          }
        },
        {
          enableHighAccuracy: true,  // CRITICAL: Request GPS-level accuracy
          timeout: 15000,            // Wait up to 15 seconds for GPS fix
          maximumAge: 30000          // Accept cached position up to 30 seconds old
        }
      );
    }
  }, []);

  // Save map position AUTOMATICALLY whenever it changes
  // This way, no matter how the user leaves (back button, link, browser back),
  // their position is always saved
  const saveMapPosition = useCallback(() => {
    if (mapCenter) {
      sessionStorage.setItem('heardrop_map_position', JSON.stringify({
        center: mapCenter,
        zoom: mapZoom
      }));
    }
  }, [mapCenter, mapZoom]);

  // Auto-save position whenever map moves
  useEffect(() => {
    saveMapPosition();
  }, [saveMapPosition]);
  // Handle map popup events
  useEffect(() => {
    const handleBrandClick = (e: CustomEvent<{ brandId: string }>) => {
      const brand = brands.find(b => b.id === e.detail.brandId);
      if (brand) {
        saveMapPosition();
        navigate(`/brand/${brand.slug}`);
      }
    };
    
    const handleShopDetails = (e: CustomEvent<{ shopId: string }>) => {
      const shop = shops.find(s => s.id === e.detail.shopId);
      if (shop) {
        setSelectedShopForDetails(shop);
        setDetailsModalOpen(true);
      }
    };
    
    const handleAddToJourney = (e: CustomEvent<{ shopId: string }>) => {
      const shop = shops.find(s => s.id === e.detail.shopId);
      if (shop && !journeyStops.find(s => s.id === shop.id)) {
        haptic.success();
        setJourneyStops(prev => [...prev, shop]);
        toast({
          title: "Added to journey",
          description: `${shop.name} has been added to your route.`,
        });
      } else if (shop && journeyStops.find(s => s.id === shop.id)) {
        toast({
          title: "Already in journey",
          description: `${shop.name} is already in your route.`,
          variant: "destructive",
        });
      }
    };
    
    window.addEventListener('map:brandClick' as any, handleBrandClick);
    window.addEventListener('map:shopDetails' as any, handleShopDetails);
    window.addEventListener('map:addToJourney' as any, handleAddToJourney);
    
    return () => {
      window.removeEventListener('map:brandClick' as any, handleBrandClick);
      window.removeEventListener('map:shopDetails' as any, handleShopDetails);
      window.removeEventListener('map:addToJourney' as any, handleAddToJourney);
    };
  }, [shops, journeyStops, navigate, brands, saveMapPosition]);

  // Restore map position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('heardrop_map_position');
    if (saved && !searchParams.get('shopId')) {
      try {
        const { center, zoom } = JSON.parse(saved);
        if (center && !mapCenter) {
          setMapCenter(center);
          setMapZoom(zoom || 12);
        }
        // Clear saved position after restoring
        sessionStorage.removeItem('heardrop_map_position');
      } catch (e) {
        console.error('Error restoring map position:', e);
      }
    }
  }, []);

  // Draggable panel handlers
  const handlePanelDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingPanel(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    panelStartPos.current = { ...journeyPanelPosition };
  }, [journeyPanelPosition]);

  const handlePanelDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingPanel) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;
    
    setJourneyPanelPosition({
      x: Math.max(8, Math.min(window.innerWidth - 220, panelStartPos.current.x + deltaX)),
      y: Math.max(-300, Math.min(0, panelStartPos.current.y + deltaY))
    });
  }, [isDraggingPanel]);

  const handlePanelDragEnd = useCallback(() => {
    setIsDraggingPanel(false);
  }, []);

  useEffect(() => {
    if (!isDraggingPanel) return;
    
    window.addEventListener('mousemove', handlePanelDragMove);
    window.addEventListener('mouseup', handlePanelDragEnd);
    window.addEventListener('touchmove', handlePanelDragMove as any);
    window.addEventListener('touchend', handlePanelDragEnd);
    
    return () => {
      window.removeEventListener('mousemove', handlePanelDragMove);
      window.removeEventListener('mouseup', handlePanelDragEnd);
      window.removeEventListener('touchmove', handlePanelDragMove as any);
      window.removeEventListener('touchend', handlePanelDragEnd);
    };
  }, [isDraggingPanel, handlePanelDragMove, handlePanelDragEnd]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setJourneyStops((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Fetch shops and brands
  useEffect(() => {
    const fetchData = async () => {
      // Fetch shops and brands in parallel
      const [shopsResult, brandsResult] = await Promise.all([
        supabase.from('shops_public').select('*').order('name'),
        supabase.from('brands').select('id, slug, name, logo_url, banner_url, description, history, instagram_url, tiktok_url, official_website, country, category').eq('is_active', true)
      ]);

      if (shopsResult.error) {
        console.error('Error fetching shops:', shopsResult.error);
      } else {
        setShops(shopsResult.data || []);
        setFilteredShops(shopsResult.data || []);
      }
      
      if (brandsResult.error) {
        console.error('Error fetching brands:', brandsResult.error);
      } else {
        setBrands(brandsResult.data || []);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  // Handle URL parameters for centering map on specific shop
  useEffect(() => {
    if (shops.length === 0) return;

    const shopId = searchParams.get('shopId');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const zoom = searchParams.get('zoom');

    if (shopId && lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const parsedZoom = zoom ? parseInt(zoom) : 15;

      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        // Set map center and zoom
        setMapCenter([parsedLng, parsedLat]);
        setMapZoom(parsedZoom);
        setHighlightedShopId(shopId);

        // Find and auto-add shop to journey
        const shop = shops.find(s => s.id === shopId);
        if (shop && !journeyStops.find(s => s.id === shopId)) {
          setJourneyStops([shop]);
          setSelectedShop(shop);
          
          // Scroll to the shop in the list after a brief delay
          setTimeout(() => {
            const shopElement = document.getElementById(`shop-${shopId}`);
            shopElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 500);
        }
      }
    }
  }, [shops, searchParams]);

  // Filter and sort shops (using debounced search query for optimization)
  useEffect(() => {
    let filtered = shops;

    if (debouncedSearchQuery) {
      filtered = filtered.filter(shop =>
        shop.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        shop.address?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        shop.city?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        shop.country?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter(shop => shop.country === selectedCountry);
    }

    if (selectedCity !== "all") {
      filtered = filtered.filter(shop => shop.city === selectedCity);
    }

    // Sort by distance if enabled and user location is available
    if (sortByDistance && userLocation) {
      filtered = [...filtered].sort((a, b) => {
        if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) return 0;
        const distA = calculateDistance(userLocation.lat, userLocation.lng, Number(a.latitude), Number(a.longitude));
        const distB = calculateDistance(userLocation.lat, userLocation.lng, Number(b.latitude), Number(b.longitude));
        return distA - distB;
      });
    }

    setFilteredShops(filtered);
  }, [debouncedSearchQuery, selectedCountry, selectedCity, shops, sortByDistance, userLocation]);

  // Handle visible shops change from map
  const handleVisibleShopsChange = useCallback((shops: ShopType[]) => {
    setVisibleShops(shops);
  }, []);

  // Handle map center change for distance calculations and position persistence
  const handleMapCenterChange = useCallback((center: { lat: number; lng: number; zoom: number }) => {
    setMapCenterLocation(center);
    // Only update for persistence, do NOT update mapCenter to avoid re-render loop
    sessionStorage.setItem('heardrop_map_position', JSON.stringify({
      center: [center.lng, center.lat],
      zoom: center.zoom
    }));
  }, []);

  // Center map on a shop when clicked from bottom sheet
  const handleShopClickFromSheet = useCallback((shop: ShopType) => {
    if (shop.latitude && shop.longitude) {
      // Dispatch custom event to center the map
      window.dispatchEvent(new CustomEvent('map:centerOnShop', { detail: shop.id }));
      setHighlightedShopId(shop.id);
      setSelectedShop(shop);
    }
  }, []);

  // Get unique countries and cities
  const countries = Array.from(new Set(shops.map(shop => shop.country))).sort();
  const cities = Array.from(new Set(
    shops
      .filter(shop => selectedCountry === "all" || shop.country === selectedCountry)
      .map(shop => shop.city)
  )).sort();

  const addToJourney = (shop: ShopType) => {
    if (!journeyStops.find(s => s.id === shop.id)) {
      haptic.success();
      setJourneyStops([...journeyStops, shop]);
      setSelectedShop(null);
    }
  };

  const removeFromJourney = (shopId: string) => {
    haptic.light();
    setJourneyStops(journeyStops.filter(s => s.id !== shopId));
  };

  const isInJourney = (shopId: string) => {
    return journeyStops.some(s => s.id === shopId);
  };

  const getDirections = (shop: ShopType) => {
    if (shop.latitude && shop.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`,
        '_blank'
      );
    }
  };

  const openShopDetails = (shop: ShopType) => {
    setSelectedShopForDetails(shop);
    setDetailsModalOpen(true);
  };

  const activeFilterCount = [
    searchQuery,
    selectedCountry !== "all", 
    selectedCity !== "all"
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-md border-2 border-white/20 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
            
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
          
          {/* Map - Full height on mobile minus header, tab bar, and peek sheet */}
          <div className="flex-1 relative flex flex-col">
            <Card className="border-0 shadow-none overflow-hidden h-full rounded-none">
              <CardContent className="p-0 h-full relative">
                <div className="w-full h-full">
                  <Map
                    shops={filteredShops}
                    brands={brands}
                    onShopClick={(shop) => {
                      setSelectedShop(shop);
                    }}
                    selectedShop={selectedShop}
                    journeyStops={journeyStops}
                    onRouteUpdate={setRouteInfo}
                    onVisibleShopsChange={handleVisibleShopsChange}
                    onMapCenterChange={handleMapCenterChange}
                    initialCenter={mapCenter}
                    initialZoom={mapZoom}
                    highlightedShopId={highlightedShopId}
                    isFullscreen={isMapFullscreen}
                    deferRouteCalculation={true}
                  />
                </div>
                
                {/* Journey Stops Overlay - Draggable floating panel */}
                {journeyStops.length > 0 && (
                  <div 
                    className="hidden lg:block absolute z-10 lg:max-w-[200px] select-none"
                    style={{
                      left: `${journeyPanelPosition.x}px`,
                      bottom: `${80 - journeyPanelPosition.y}px`,
                      cursor: isDraggingPanel ? 'grabbing' : 'auto',
                    }}
                  >
                    <Card className="glass-card border border-directions/20 bg-background/95 backdrop-blur-md shadow-lg">
                      {/* Drag handle */}
                      <div 
                        className="flex items-center justify-center py-1 cursor-grab active:cursor-grabbing hover:bg-directions/5 transition-colors rounded-t-lg"
                        onMouseDown={handlePanelDragStart}
                        onTouchStart={handlePanelDragStart}
                      >
                        <Move className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <CardHeader className="py-1 px-2 border-t border-directions/10">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-[10px] uppercase tracking-wider text-directions font-bold flex items-center gap-1">
                            🗺️ Journey ({journeyStops.length})
                          </CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setJourneyStops([])}
                            className="h-4 px-1 text-[10px] hover:bg-destructive/10 hover:text-destructive"
                          >
                            Clear
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-1.5 space-y-1 max-h-[140px] overflow-y-auto">
                        {/* Your Location indicator */}
                        {userLocation && (
                          <div className="flex items-center gap-1 p-1 bg-primary/10 rounded border border-primary/20">
                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Navigation className="w-2.5 h-2.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold text-primary">Your Location</p>
                            </div>
                          </div>
                        )}
                        
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={journeyStops.map(stop => stop.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {journeyStops.map((stop, index) => (
                              <SortableStop
                                key={stop.id}
                                stop={stop}
                                index={userLocation ? index + 1 : index}
                                onRemove={removeFromJourney}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                        
                        {journeyStops.length >= 1 && (
                          <Button 
                            size="sm"
                            className="w-full bg-directions hover:bg-directions/90 text-directions-foreground font-bold uppercase tracking-wider text-[10px] py-0.5 h-6"
                            onClick={() => {
                              // Build waypoints array starting with user's current location
                              const allWaypoints: string[] = [];
                              
                              // Add user's current location as starting point if available
                              if (userLocation) {
                                allWaypoints.push(`${userLocation.lat},${userLocation.lng}`);
                              }
                              
                              // Add all journey stops
                              journeyStops.forEach(stop => {
                                allWaypoints.push(`${stop.latitude},${stop.longitude}`);
                              });
                              
                              window.open(
                                `https://www.google.com/maps/dir/${allWaypoints.join('/')}`,
                                '_blank'
                              );
                            }}
                          >
                            <Navigation className="w-2.5 h-2.5 mr-0.5" />
                            Start Navigation
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Removed mobile shops toggle button - bottom sheet is always visible */}

                {/* Desktop Side Panel */}
                <DesktopSidePanel
                  shops={filteredShops}
                  visibleShops={visibleShops}
                  onShopClick={handleShopClickFromSheet}
                  onAddToJourney={addToJourney}
                  onOpenDetails={openShopDetails}
                  isInJourney={isInJourney}
                  selectedShopId={selectedShop?.id}
                  highlightedShopId={highlightedShopId}
                  userLocation={userLocation}
                  mapCenterLocation={mapCenterLocation}
                  calculateDistance={calculateDistance}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
                {/* City Selector Chip */}
                <CityChip
                  onCitySelect={(center, zoom) => {
                    setMapCenter(center);
                    setMapZoom(zoom);
                  }}
                />
                {/* Fullscreen button removed - map is already full screen */}
              </CardContent>
            </Card>

            {/* Turn-by-turn directions panel - Hidden on mobile when shops sheet is open */}
            {(journeyStops.length > 0 || selectedShop) && routeInfo && (
              <Card className="hidden lg:block absolute bottom-4 right-4 w-80 max-h-96 overflow-hidden border-2 border-directions shadow-2xl animate-slide-in-right backdrop-blur-md bg-background/95">
                <CardHeader className="border-b border-directions/20 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-directions">
                      🧭 Navigation
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setRouteInfo(null);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      ✕
                    </Button>
                  </div>
                  <CardDescription className="text-xs mt-2">
                    <div className="flex items-center gap-4 text-foreground">
                      <span className="font-semibold">
                        📏 {(routeInfo.distance / 1000).toFixed(2)} km
                      </span>
                      <span className="font-semibold">
                        ⏱️ {Math.ceil(routeInfo.duration / 60)} min
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-80 overflow-y-auto">
                    {routeInfo.steps.map((step: any, index: number) => (
                      <div 
                        key={index}
                        className="p-3 border-b border-border/50 hover:bg-directions/5 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-directions/20 text-directions flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {step.maneuver.instruction}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.distance > 0 ? `${Math.round(step.distance)}m` : 'Arrive'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </main>

      {/* Mobile Filter Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="uppercase tracking-wider text-directions font-bold flex items-center justify-between">
              🔍 Search & Filter
              {activeFilterCount > 0 && (
                <Badge className="bg-directions text-directions-foreground">
                  {activeFilterCount}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              📍 {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} found
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            {userLocation && (
              <div className="flex items-center justify-between p-3 bg-directions/5 rounded-lg border border-directions/20">
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="w-4 h-4 text-directions" />
                  <span className="font-medium">Sort by proximity</span>
                </div>
                <Button
                  variant={sortByDistance ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortByDistance(!sortByDistance)}
                  className={sortByDistance ? "bg-directions hover:bg-directions/90 text-directions-foreground" : ""}
                >
                  {sortByDistance ? "On" : "Off"}
                </Button>
              </div>
            )}
            
            <Input
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-directions/20 focus:ring-directions"
            />
            

            <Select value={selectedCountry} onValueChange={(value) => {
              setSelectedCountry(value);
              setSelectedCity("all");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button 
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                  setSearchQuery("");
                  setSelectedCountry("all");
                  setSelectedCity("all");
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Bottom Sheet - Route mode or Shops mode */}
      {isRouteMode ? (
        <RouteBottomSheet
          journeyStops={journeyStops}
          onRemoveStop={removeFromJourney}
          onClearAll={() => setJourneyStops([])}
          onStartNavigation={() => {
            const allWaypoints: string[] = [];
            if (userLocation) {
              allWaypoints.push(`${userLocation.lat},${userLocation.lng}`);
            }
            journeyStops.forEach(stop => {
              allWaypoints.push(`${stop.latitude},${stop.longitude}`);
            });
            window.open(`https://www.google.com/maps/dir/${allWaypoints.join('/')}`, '_blank');
          }}
          userLocation={userLocation}
          onShopClick={handleShopClickFromSheet}
          calculateDistance={calculateDistance}
          routeInfo={routeInfo}
        />
      ) : (
        <ShopsBottomSheet
          shops={filteredShops}
          visibleShops={visibleShops}
          onShopClick={handleShopClickFromSheet}
          onAddToJourney={addToJourney}
          onOpenDetails={openShopDetails}
          isInJourney={isInJourney}
          selectedShopId={selectedShop?.id}
          userLocation={userLocation}
          calculateDistance={calculateDistance}
          mapCenterLocation={mapCenterLocation}
          isLoadingLocation={!userLocation && loading}
        />
      )}

      {/* Shop Details - Bottom Sheet on mobile, Modal on desktop */}
      {selectedShopForDetails && (
        <div className="lg:hidden">
          <ShopDetailBottomSheet
            shop={selectedShopForDetails}
            brand={brands.find(b => b.id === selectedShopForDetails.brand_id) || null}
            onClose={() => { setSelectedShopForDetails(null); setDetailsModalOpen(false); }}
            onAddToJourney={addToJourney}
            onGetDirections={getDirections}
            isInJourney={isInJourney(selectedShopForDetails.id)}
            userLocation={userLocation}
            calculateDistance={calculateDistance}
          />
        </div>
      )}
      <div className="hidden lg:block">
        <ShopDetailsModal
          shop={selectedShopForDetails}
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          onAddToJourney={addToJourney}
          onGetDirections={getDirections}
          isInJourney={selectedShopForDetails ? isInJourney(selectedShopForDetails.id) : false}
        />
      </div>
    </div>
  );
};

export default Directions;
