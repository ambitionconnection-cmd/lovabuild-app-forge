import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tables } from '@/integrations/supabase/types';

interface MapProps {
  shops: Tables<'shops'>[];
  onShopClick?: (shop: Tables<'shops'>) => void;
}

const Map: React.FC<MapProps> = ({ shops, onShopClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    // Get Mapbox token from environment
    const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (token) {
      setMapboxToken(token);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [2.3522, 48.8566], // Default to Paris
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current || shops.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for shops
    const bounds = new mapboxgl.LngLatBounds();

    shops.forEach((shop) => {
      if (shop.latitude && shop.longitude) {
        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2">
            <h3 class="font-bold text-sm mb-1">${shop.name}</h3>
            <p class="text-xs text-gray-600 mb-1">${shop.address}, ${shop.city}</p>
            ${shop.phone ? `<p class="text-xs">${shop.phone}</p>` : ''}
          </div>`
        );

        // Create marker
        const marker = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([shop.longitude, shop.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        // Add click handler
        marker.getElement().addEventListener('click', () => {
          if (onShopClick) {
            onShopClick(shop);
          }
        });

        markersRef.current.push(marker);
        bounds.extend([shop.longitude, shop.latitude]);
      }
    });

    // Fit map to bounds if there are shops
    if (shops.length > 0 && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [shops, onShopClick]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className="w-full h-full rounded-lg shadow-lg" />
  );
};

export default Map;
