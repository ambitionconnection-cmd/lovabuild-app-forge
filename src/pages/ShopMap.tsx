import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";

// Continent boundaries and center points
const CONTINENTS = {
  all: { name: "All Continents", center: [20, 20], zoom: 1.5 },
  europe: { name: "Europe", center: [15, 50], zoom: 3.5 },
  asia: { name: "Asia", center: [100, 35], zoom: 2.5 },
  "north-america": { name: "North America", center: [-100, 45], zoom: 3 },
  "south-america": { name: "South America", center: [-60, -15], zoom: 3 },
  africa: { name: "Africa", center: [20, 0], zoom: 3 },
  oceania: { name: "Oceania", center: [135, -25], zoom: 3.5 },
};

// Map countries to continents
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  "Netherlands": "europe",
  "United Kingdom": "europe",
  "Denmark": "europe",
  "France": "europe",
  "Germany": "europe",
  "Czech Republic": "europe",
  "Poland": "europe",
  "Italy": "europe",
  "Sweden": "europe",
  "United States": "north-america",
  "Mexico": "north-america",
  "South Korea": "asia",
  "Japan": "asia",
  "China": "asia",
  "Taiwan": "asia",
  "Hong Kong": "asia",
  "Malaysia": "asia",
  "Indonesia": "asia",
  "Vietnam": "asia",
};

const ShopMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [shops, setShops] = useState<Tables<'shops'>[]>([]);
  const [brands, setBrands] = useState<Record<string, Tables<'brands'>>>({});
  const [loading, setLoading] = useState(true);
  const [selectedContinent, setSelectedContinent] = useState<string>("all");

  useEffect(() => {
    fetchShopsAndBrands();
  }, []);

  const fetchShopsAndBrands = async () => {
    try {
      const [shopsRes, brandsRes] = await Promise.all([
        supabase
          .from('shops')
          .select('*')
          .eq('is_active', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null),
        supabase
          .from('brands')
          .select('*')
      ]);

      if (shopsRes.error) throw shopsRes.error;
      if (brandsRes.error) throw brandsRes.error;

      setShops(shopsRes.data || []);
      
      // Create brands lookup map
      const brandsMap: Record<string, Tables<'brands'>> = {};
      brandsRes.data?.forEach(brand => {
        brandsMap[brand.id] = brand;
      });
      setBrands(brandsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load shop locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || loading) return;

    const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox token not found');
      return;
    }

    // Initialize map
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [20, 20],
      zoom: 1.5,
      pitch: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add geolocate control to show user's location
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
    });
    
    map.current.addControl(geolocateControl, 'top-right');

    // Wait for map to load before adding markers
    map.current.on('load', () => {
      updateMarkers();
      
      // Trigger geolocation on load to center on user
      setTimeout(() => {
        geolocateControl.trigger();
      }, 1000);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [loading]);

  useEffect(() => {
    if (map.current && !loading) {
      updateMarkers();
      updateMapView();
    }
  }, [selectedContinent, shops, brands]);

  const updateMapView = () => {
    if (!map.current) return;

    const continent = CONTINENTS[selectedContinent as keyof typeof CONTINENTS] || CONTINENTS.all;
    map.current.flyTo({
      center: continent.center as [number, number],
      zoom: continent.zoom,
      duration: 1500,
    });
  };

  const updateMarkers = () => {
    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter shops by continent
    const filteredShops = selectedContinent === "all" 
      ? shops 
      : shops.filter(shop => COUNTRY_TO_CONTINENT[shop.country] === selectedContinent);

    // Add markers for filtered shops
    filteredShops.forEach(shop => {
      if (!shop.latitude || !shop.longitude) return;

      const brand = shop.brand_id ? brands[shop.brand_id] : null;

      // Create custom marker element with vibrant colors
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.cursor = 'pointer';
      
      const category = shop.category || 'streetwear';
      const colorMap: Record<string, string> = {
        streetwear: 'hsl(var(--drops))',
        luxury: 'hsl(var(--pro-gold))',
        sneakers: 'hsl(var(--directions))',
        accessories: 'hsl(var(--heardrop))',
        vintage: 'hsl(var(--global))',
        sportswear: 'hsl(var(--primary))',
      };
      
      const markerColor = colorMap[category] || 'hsl(var(--primary))';
      
      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: ${markerColor};
          border: 3px solid hsl(var(--background));
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 20px ${markerColor}40;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: hsl(var(--background));
          font-size: 16px;
          transition: transform 0.2s;
        ">
          ${shop.name.charAt(0).toUpperCase()}
        </div>
      `;
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Create popup content
      const popupContent = `
        <div style="font-family: system-ui; max-width: 300px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
            ${shop.name}
          </h3>
          ${brand ? `
            <div style="margin-bottom: 8px;">
              <span style="
                display: inline-block;
                padding: 2px 8px;
                background: hsl(var(--primary) / 0.1);
                border-radius: 4px;
                font-size: 12px;
                color: hsl(var(--primary));
              ">
                ${brand.name}
              </span>
            </div>
          ` : ''}
          <p style="margin: 4px 0; font-size: 14px; color: #666;">
            📍 ${shop.address}
          </p>
          <p style="margin: 4px 0; font-size: 14px; color: #666;">
            🌍 ${shop.city}, ${shop.country}
          </p>
          ${shop.category ? `
            <p style="margin: 4px 0; font-size: 12px;">
              <span style="
                display: inline-block;
                padding: 2px 6px;
                background: #f0f0f0;
                border-radius: 3px;
                text-transform: capitalize;
              ">
                ${shop.category}
              </span>
            </p>
          ` : ''}
          ${shop.phone ? `
            <p style="margin: 4px 0; font-size: 14px;">
              📞 ${shop.phone}
            </p>
          ` : ''}
          ${shop.official_site ? `
            <a href="${shop.official_site}" target="_blank" rel="noopener noreferrer" 
               style="
                 display: inline-block;
                 margin-top: 8px;
                 padding: 4px 12px;
                 background: hsl(var(--primary));
                 color: white;
                 text-decoration: none;
                 border-radius: 4px;
                 font-size: 12px;
               ">
              Visit Website →
            </a>
          ` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true,
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([shop.longitude, shop.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  };

  const filteredShopCount = selectedContinent === "all" 
    ? shops.length 
    : shops.filter(shop => COUNTRY_TO_CONTINENT[shop.country] === selectedContinent).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-primary/20 bg-gradient-to-r from-background via-primary/5 to-background sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-directions bg-clip-text text-transparent">
              Global Shop Map
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              📍 {filteredShopCount} shop{filteredShopCount !== 1 ? 's' : ''} worldwide
            </p>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Filter Card */}
        <div className="absolute top-4 left-4 z-10 max-w-sm">
          <Card className="glass-card border-2 border-primary/20 bg-background/95 backdrop-blur-md shadow-2xl">
            <CardHeader className="pb-3 border-b border-primary/10">
              <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary">
                🗺️ Explore Shops
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Find streetwear locations worldwide
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Select value={selectedContinent} onValueChange={setSelectedContinent}>
                <SelectTrigger className="border-primary/20 focus:ring-primary">
                  <SelectValue placeholder="Select continent" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTINENTS).map(([key, continent]) => (
                    <SelectItem key={key} value={key}>
                      {continent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Color Legend */}
              <div className="mt-4 pt-4 border-t border-primary/10">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Categories
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{background: 'hsl(var(--drops))'}}></div>
                    <span>Streetwear</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{background: 'hsl(var(--pro-gold))'}}></div>
                    <span>Luxury</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{background: 'hsl(var(--directions))'}}></div>
                    <span>Sneakers</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{background: 'hsl(var(--heardrop))'}}></div>
                    <span>Accessories</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Shops visible:</span>
                  <Badge 
                    variant="secondary" 
                    className="bg-primary/10 text-primary border-primary/20 font-bold"
                  >
                    {filteredShopCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div 
          ref={mapContainer} 
          className="w-full h-[calc(100vh-80px)]"
          style={{ minHeight: '600px' }}
        />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Loading shop locations...</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No token warning */}
        {!import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Mapbox Token Required</CardTitle>
                <CardDescription>
                  Configure MAPBOX_PUBLIC_TOKEN in your environment variables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get your free token at{" "}
                  <a 
                    href="https://mapbox.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    mapbox.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopMap;