import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Navigation, GripVertical, Info, Maximize2, Minimize2, Filter, X, Plus, Check } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
import { NearbyShopsSheet } from "@/components/NearbyShopsSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      className={`flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-directions/20 transition-all ${
        isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : ''
      }`}
    >
      <button
        className="flex-shrink-0 cursor-grab active:cursor-grabbing hover:bg-directions/10 p-1 rounded transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-directions" />
      </button>
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-directions text-directions-foreground flex items-center justify-center text-xs font-bold">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{stop.name}</p>
        <p className="text-xs text-muted-foreground truncate">{stop.city}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(stop.id)}
        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
      >
        ✕
      </Button>
    </div>
  );
};

const Directions = () => {
  const [searchParams] = useSearchParams();
  const [shops, setShops] = useState<ShopType[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedShop, setSelectedShop] = useState<ShopType | null>(null);
  const [journeyStops, setJourneyStops] = useState<ShopType[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedShopForDetails, setSelectedShopForDetails] = useState<ShopType | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isShopsSheetOpen, setIsShopsSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [highlightedShopId, setHighlightedShopId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);

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

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setSortByDistance(true); // Auto-enable distance sorting when location is available
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

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

  // Fetch shops
  useEffect(() => {
    const fetchShops = async () => {
      const { data, error } = await supabase
        .from('shops_public')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching shops:', error);
      } else {
        setShops(data || []);
        setFilteredShops(data || []);
      }
      setLoading(false);
    };

    fetchShops();
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

  // Filter and sort shops
  useEffect(() => {
    let filtered = shops;

    if (searchQuery) {
      filtered = filtered.filter(shop =>
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(shop => shop.category === selectedCategory);
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
  }, [searchQuery, selectedCategory, selectedCountry, selectedCity, shops, sortByDistance, userLocation]);

  // Get unique countries and cities
  const countries = Array.from(new Set(shops.map(shop => shop.country))).sort();
  const cities = Array.from(new Set(
    shops
      .filter(shop => selectedCountry === "all" || shop.country === selectedCountry)
      .map(shop => shop.city)
  )).sort();

  const addToJourney = (shop: ShopType) => {
    if (!journeyStops.find(s => s.id === shop.id)) {
      setJourneyStops([...journeyStops, shop]);
      setSelectedShop(null);
    }
  };

  const removeFromJourney = (shopId: string) => {
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
    selectedCategory !== "all",
    selectedCountry !== "all", 
    selectedCity !== "all"
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-2 border-directions/20 bg-gradient-to-r from-background via-directions/5 to-background">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="hover:bg-directions/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-directions to-primary bg-clip-text text-transparent">
              Directions
            </h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="w-full h-[600px] rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:block">
      <header className="border-b-2 border-directions/20 bg-gradient-to-r from-background via-directions/5 to-background sticky top-0 z-50 backdrop-blur-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="hover:bg-directions/10 hover:text-directions">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl lg:text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-directions to-primary bg-clip-text text-transparent">
              Directions
            </h1>
          </div>
          
          {/* Mobile Filter FAB */}
          <Button
            size="icon"
            variant="secondary"
            className="lg:hidden relative bg-directions/10 hover:bg-directions/20 border border-directions/30"
            onClick={() => setIsFilterSheetOpen(true)}
          >
            <Filter className="w-5 h-5 text-directions" />
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-directions text-directions-foreground text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </header>
      
      <main className="flex-1 lg:container lg:mx-auto lg:px-4 lg:py-8 relative flex flex-col lg:block">
        <div className="lg:grid lg:grid-cols-10 lg:gap-6 flex-1 flex flex-col lg:flex-row relative">
          {/* Desktop Sidebar - Filters and Shop List */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <Card className="glass-card border-2 border-directions/20 bg-background/95 backdrop-blur-md shadow-xl">
              <CardHeader className="border-b border-directions/10">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="uppercase tracking-wider text-directions font-bold">
                      🔍 Search & Filter
                    </CardTitle>
                    <CardDescription>
                      📍 {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} found
                    </CardDescription>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                        setSelectedCountry("all");
                        setSelectedCity("all");
                      }}
                      className="h-7 text-xs hover:bg-destructive/10 hover:text-destructive"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
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
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="streetwear">Streetwear</SelectItem>
                    <SelectItem value="sneakers">Sneakers</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="sportswear">Sportswear</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCountry} onValueChange={(value) => {
                  setSelectedCountry(value);
                  setSelectedCity("all"); // Reset city when country changes
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
              </CardContent>
            </Card>

            {/* Desktop Shop List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredShops.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No shops found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredShops.slice(0, 20).map((shop) => {
                  const inJourney = isInJourney(shop.id);
                  const distance = userLocation && shop.latitude && shop.longitude
                    ? calculateDistance(userLocation.lat, userLocation.lng, Number(shop.latitude), Number(shop.longitude))
                    : null;
                  
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
                      onClick={() => !inJourney && setSelectedShop(shop)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm flex-1">{shop.name}</h3>
                          <div className="flex items-center gap-2">
                            {distance !== null && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold whitespace-nowrap">
                                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                              </span>
                            )}
                            {inJourney && (
                              <span className="text-xs bg-directions text-directions-foreground px-2 py-1 rounded-full font-bold">
                                #{journeyStops.findIndex(s => s.id === shop.id) + 1}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground mb-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{shop.address}, {shop.city}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openShopDetails(shop);
                            }}
                            className="text-xs h-7"
                          >
                            <Info className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                          {!inJourney ? (
                            <Button 
                              size="sm" 
                              className="text-xs h-7 bg-directions hover:bg-directions/90 text-directions-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToJourney(shop);
                              }}
                              disabled={!shop.latitude || !shop.longitude}
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs h-7 border-destructive/50 text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromJourney(shop.id);
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
          </div>

          {/* Map - Full height on mobile, fixed height on desktop */}
          <div className={`lg:col-span-7 relative flex flex-col ${isMapFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
            <Card className={`border-2 border-primary/20 shadow-2xl overflow-hidden ${isMapFullscreen ? 'h-screen rounded-none' : 'h-[calc(100vh-320px)] lg:h-[600px] rounded-none lg:rounded-xl'}`}>
              <CardContent className="p-0 h-full relative">
                <div className="w-full h-full">
                  <Map 
                    shops={filteredShops} 
                    onShopClick={(shop) => {
                      if (!isInJourney(shop.id)) {
                        setSelectedShop(shop);
                      }
                    }}
                    selectedShop={selectedShop}
                    journeyStops={journeyStops}
                    onRouteUpdate={setRouteInfo}
                    initialCenter={mapCenter}
                    initialZoom={mapZoom}
                    highlightedShopId={highlightedShopId}
                  />
                </div>
                
                {/* Journey Stops Overlay - Bottom left on mobile */}
                {journeyStops.length > 0 && (
                  <div className="absolute bottom-20 lg:top-4 left-4 right-4 lg:right-auto lg:max-w-xs z-10">
                    <Card className="glass-card border-2 border-directions/20 bg-background/95 backdrop-blur-md shadow-xl">
                      <CardHeader className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs uppercase tracking-wider text-directions font-bold flex items-center gap-1">
                            🗺️ Journey ({journeyStops.length})
                          </CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setJourneyStops([])}
                            className="h-5 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                          >
                            Clear
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-2 space-y-2 max-h-[200px] overflow-y-auto">
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
                                index={index}
                                onRemove={removeFromJourney}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                        
                        {journeyStops.length >= 1 && (
                          <Button 
                            size="sm"
                            className="w-full bg-directions hover:bg-directions/90 text-directions-foreground font-bold uppercase tracking-wider text-xs py-1 h-8"
                            onClick={() => {
                              const waypoints = journeyStops
                                .map(stop => `${stop.latitude},${stop.longitude}`)
                                .join('/');
                              window.open(
                                `https://www.google.com/maps/dir/${waypoints}`,
                                '_blank'
                              );
                            }}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Start Navigation
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Mobile Shops Toggle Button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="lg:hidden absolute bottom-4 right-4 z-10 bg-directions/90 backdrop-blur-md shadow-lg hover:bg-directions border border-directions text-directions-foreground"
                  onClick={() => setIsShopsSheetOpen(true)}
                >
                  <MapPin className="w-5 h-5" />
                </Button>

                {/* Fullscreen Toggle Button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur-md shadow-lg hover:bg-background border border-border"
                  onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                >
                  {isMapFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </Button>
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

            {/* Nearby Shops List Below Map */}
            {!isMapFullscreen && (
              <Card className="mt-4 border-2 border-directions/20 shadow-lg rounded-none lg:rounded-xl">
                <CardHeader className="border-b border-directions/10 py-3">
                  <CardTitle className="text-sm uppercase tracking-wider text-directions font-bold flex items-center gap-2">
                    📍 Nearby Shops ({filteredShops.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[150px]">
                    {filteredShops.length === 0 ? (
                      <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                        No shops match your filters
                      </div>
                    ) : (
                      <div className="space-y-2 pr-4">
                        {filteredShops.map((shop) => {
                          const distance = userLocation && shop.latitude && shop.longitude
                            ? calculateDistance(userLocation.lat, userLocation.lng, Number(shop.latitude), Number(shop.longitude))
                            : null;
                          
                          return (
                            <div 
                              key={shop.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer border border-border/50"
                              onClick={() => {
                                setMapCenter([Number(shop.longitude), Number(shop.latitude)]);
                                setMapZoom(15);
                                setHighlightedShopId(shop.id);
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{shop.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {shop.address}, {shop.city}
                                  {distance !== null && ` • ${distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}`}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToJourney(shop);
                                }}
                                className="flex-shrink-0 h-8 w-8 p-0 hover:bg-directions/10 hover:text-directions"
                                disabled={isInJourney(shop.id)}
                              >
                                {isInJourney(shop.id) ? <Check className="w-4 h-4 text-directions" /> : <Plus className="w-4 h-4" />}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
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
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="streetwear">Streetwear</SelectItem>
                <SelectItem value="sneakers">Sneakers</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="sportswear">Sportswear</SelectItem>
              </SelectContent>
            </Select>

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
                  setSelectedCategory("all");
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

      {/* Mobile Nearby Shops Sheet */}
      <NearbyShopsSheet
        shops={filteredShops}
        isOpen={isShopsSheetOpen}
        onOpenChange={setIsShopsSheetOpen}
        onShopClick={(shop) => {
          setSelectedShop(shop);
          setIsShopsSheetOpen(false);
        }}
        onAddToJourney={addToJourney}
        onRemoveFromJourney={removeFromJourney}
        onOpenDetails={openShopDetails}
        isInJourney={isInJourney}
        journeyStops={journeyStops}
        selectedShop={selectedShop}
        highlightedShopId={highlightedShopId}
        userLocation={userLocation}
        calculateDistance={calculateDistance}
      />

      {/* Shop Details Modal */}
      <ShopDetailsModal
        shop={selectedShopForDetails}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        onAddToJourney={addToJourney}
        onGetDirections={getDirections}
        isInJourney={selectedShopForDetails ? isInJourney(selectedShopForDetails.id) : false}
      />
    </div>
  );
};

export default Directions;
