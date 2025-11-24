import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Phone, ExternalLink, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import Map from "@/components/Map";

const Directions = () => {
  const [shops, setShops] = useState<Omit<Tables<'shops'>, 'email' | 'phone'>[]>([]);
  const [filteredShops, setFilteredShops] = useState<Omit<Tables<'shops'>, 'email' | 'phone'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedShop, setSelectedShop] = useState<Omit<Tables<'shops'>, 'email' | 'phone'> | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);

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

  // Filter shops
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

    setFilteredShops(filtered);
  }, [searchQuery, selectedCategory, selectedCountry, selectedCity, shops]);

  // Get unique countries and cities
  const countries = Array.from(new Set(shops.map(shop => shop.country))).sort();
  const cities = Array.from(new Set(
    shops
      .filter(shop => selectedCountry === "all" || shop.country === selectedCountry)
      .map(shop => shop.city)
  )).sort();

  const getDirections = (shop: Omit<Tables<'shops'>, 'email' | 'phone'>) => {
    if (shop.latitude && shop.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`,
        '_blank'
      );
    }
  };

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
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-directions/20 bg-gradient-to-r from-background via-directions/5 to-background sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="hover:bg-directions/10 hover:text-directions">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-directions to-primary bg-clip-text text-transparent">
            Directions
          </h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
          {/* Filters and Shop List */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card border-2 border-directions/20 bg-background/95 backdrop-blur-md shadow-xl">
              <CardHeader className="border-b border-directions/10">
                <CardTitle className="uppercase tracking-wider text-directions font-bold">🔍 Search & Filter</CardTitle>
                <CardDescription>Find shops near you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
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

                <p className="text-sm font-semibold text-directions border-t border-directions/10 pt-4">
                  📍 {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} found
                </p>
              </CardContent>
            </Card>

            {/* Shop List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredShops.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No shops found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredShops.map((shop) => (
                  <Card 
                    key={shop.id} 
                    className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-2 ${
                      selectedShop?.id === shop.id 
                        ? 'bg-directions/10 border-directions shadow-lg shadow-directions/20' 
                        : 'border-border hover:border-directions/50'
                    }`}
                    onClick={() => setSelectedShop(shop)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{shop.name}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{shop.address}, {shop.city}, {shop.country}</span>
                        </div>
                        {/* Phone number hidden for security - only show to authenticated users */}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          className="bg-directions hover:bg-directions/90 text-directions-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            getDirections(shop);
                          }}
                          disabled={!shop.latitude || !shop.longitude}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Directions
                        </Button>
                        {shop.official_site && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(shop.official_site!, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2 relative">
            <Card className="h-[800px] border-2 border-primary/20 shadow-2xl overflow-hidden">
              <CardContent className="p-0 h-full">
                <Map 
                  shops={filteredShops} 
                  onShopClick={(shop) => {
                    setSelectedShop(shop);
                    setRouteInfo(null);
                  }}
                  selectedShop={selectedShop}
                  onRouteUpdate={setRouteInfo}
                />
              </CardContent>
            </Card>

            {/* Turn-by-turn directions panel */}
            {selectedShop && routeInfo && (
              <Card className="absolute bottom-4 right-4 w-80 max-h-96 overflow-hidden border-2 border-directions shadow-2xl animate-slide-in-right backdrop-blur-md bg-background/95">
                <CardHeader className="border-b border-directions/20 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-directions">
                      🧭 Navigation
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedShop(null);
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
    </div>
  );
};

export default Directions;
