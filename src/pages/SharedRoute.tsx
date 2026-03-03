import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin, ArrowLeft, ExternalLink } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface RouteStop {
  id: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

const SharedRoute = () => {
  const { code } = useParams<{ code: string }>();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Load shared route
  useEffect(() => {
    if (!code) return;
    const load = async () => {
      const { data, error: err } = await (supabase.from('shared_routes') as any)
        .select('stops')
        .eq('code', code)
        .single();

      if (err || !data) {
        setError(true);
        setLoading(false);
        return;
      }
      setStops(data.stops as RouteStop[]);
      setLoading(false);
    };
    load();
  }, [code]);

  // Get user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silent fail
    );
  }, []);

  // Init map once stops are loaded
  useEffect(() => {
    if (loading || error || stops.length === 0 || !mapContainer.current) return;
    if (map.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const validStops = stops.filter(s => s.latitude && s.longitude);
    const center: [number, number] = userLocation
      ? [userLocation.lng, userLocation.lat]
      : validStops.length > 0
        ? [validStops[0].longitude!, validStops[0].latitude!]
        : [0, 0];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 12,
    });

    map.current.on('load', () => {
      // User location marker
      if (userLocation) {
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg';
        new mapboxgl.Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map.current!);
      }

      // Stop markers
      const bounds = new mapboxgl.LngLatBounds();
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);

      validStops.forEach((stop, i) => {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shadow-lg';
        el.style.backgroundColor = '#C4956A';
        el.textContent = `${i + 1}`;

        new mapboxgl.Marker({ element: el })
          .setLngLat([stop.longitude!, stop.latitude!])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${stop.name}</strong><br/><small>${stop.address || ''}</small>`))
          .addTo(map.current!);

        bounds.extend([stop.longitude!, stop.latitude!]);
      });

      if (!bounds.isEmpty()) {
        map.current!.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    });
  }, [loading, error, stops, userLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="w-48 h-6 mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Navigation className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Route not found</h1>
          <p className="text-muted-foreground text-sm">This link may have expired or doesn't exist.</p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Map
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const openInGoogleMaps = () => {
    const validStops = stops.filter(s => s.latitude && s.longitude);
    if (validStops.length === 0) return;

    const origin = userLocation
      ? `${userLocation.lat},${userLocation.lng}`
      : `${validStops[0].latitude},${validStops[0].longitude}`;
    const destination = `${validStops[validStops.length - 1].latitude},${validStops[validStops.length - 1].longitude}`;
    const waypoints = validStops.length > 1
      ? validStops.slice(0, -1).map(s => `${s.latitude},${s.longitude}`).join('|')
      : '';

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=walking`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border/50 bg-background/95 backdrop-blur-lg z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[#C4956A]" />
            <span className="font-bold text-sm uppercase tracking-wider text-[#C4956A]">Shared Route</span>
            <Badge variant="secondary" className="text-xs bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20">
              {stops.length} stop{stops.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-xs">
              Open App
            </Button>
          </Link>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="w-full h-[45vh] lg:h-[55vh]" />

      {/* Stops list */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-4 space-y-2">
          {userLocation && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              Your Location
            </div>
          )}
          {stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card/50 border border-border/30">
              <div className="w-7 h-7 rounded-full bg-[#C4956A]/20 text-[#C4956A] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">{stop.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[stop.address, stop.city].filter(Boolean).join(', ')}
                </p>
              </div>
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border/50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button onClick={openInGoogleMaps} className="flex-1 bg-[#C4956A] hover:bg-[#C4956A]/80 text-white font-semibold">
            <ExternalLink className="w-4 h-4 mr-2" />
            Navigate
          </Button>
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full">
              Open in FLYAF
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SharedRoute;
