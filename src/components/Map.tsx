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
    // Set Mapbox token
    setMapboxToken('pk.eyJ1IjoiY2hyaXMtY2FybG9zIiwiYSI6ImNtaWM3MDhpbTBxbHMyanM2ZXdscjZndGoifQ.OhI-E76ufbnm3pQdVzalNQ');
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
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
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
    });
    
    map.current.addControl(geolocateControl, 'top-right');

    // Wait for map to load, then trigger geolocation
    map.current.on('load', () => {
      setTimeout(() => {
        geolocateControl.trigger();
      }, 500);
    });

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
        // Create custom marker element
        const el = document.createElement('div');
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.cursor = 'pointer';
        
        const category = shop.category || 'streetwear';
        const colorMap: Record<string, string> = {
          streetwear: 'hsl(271, 85%, 65%)',
          luxury: 'hsl(45, 93%, 58%)',
          sneakers: 'hsl(186, 95%, 55%)',
          accessories: 'hsl(25, 95%, 53%)',
          vintage: 'hsl(142, 90%, 60%)',
          sportswear: 'hsl(200, 98%, 39%)',
        };
        
        const markerColor = colorMap[category] || 'hsl(200, 98%, 39%)';
        
        el.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: ${markerColor};
            border: 3px solid hsl(209, 40%, 96%);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 15px ${markerColor}40;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 14px;
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
        
        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-3 bg-card rounded-lg">
            <h3 class="font-bold text-base mb-2">${shop.name}</h3>
            <p class="text-sm text-muted-foreground mb-1">📍 ${shop.address}, ${shop.city}</p>
            ${shop.phone ? `<p class="text-sm">📞 ${shop.phone}</p>` : ''}
          </div>`
        );

        // Create marker with custom element
        const marker = new mapboxgl.Marker(el)
          .setLngLat([shop.longitude, shop.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        // Add click handler
        el.addEventListener('click', () => {
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
