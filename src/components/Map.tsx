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

    // Create GeoJSON from shops
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: shops
        .filter(shop => shop.latitude && shop.longitude)
        .map(shop => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [shop.longitude!, shop.latitude!]
          },
          properties: {
            id: shop.id,
            name: shop.name,
            address: shop.address,
            city: shop.city,
            phone: shop.phone,
            category: shop.category || 'streetwear',
          }
        }))
    };

    // Remove existing source and layers if they exist
    if (map.current.getSource('shops')) {
      if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
      if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
      if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
      map.current.removeSource('shops');
    }

    // Add source with clustering
    map.current.addSource('shops', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // Add cluster circles layer
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'shops',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          'hsl(186, 95%, 55%)', // directions color
          10,
          'hsl(271, 85%, 65%)', // drops color
          30,
          'hsl(45, 93%, 58%)' // pro-gold color
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10,
          30,
          30,
          40
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': 'hsl(209, 40%, 96%)',
        'circle-opacity': 0.9
      }
    });

    // Add cluster count labels
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'shops',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Add unclustered points layer
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'shops',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'category'],
          'streetwear', 'hsl(271, 85%, 65%)',
          'luxury', 'hsl(45, 93%, 58%)',
          'sneakers', 'hsl(186, 95%, 55%)',
          'accessories', 'hsl(25, 95%, 53%)',
          'vintage', 'hsl(142, 90%, 60%)',
          'sportswear', 'hsl(200, 98%, 39%)',
          'hsl(200, 98%, 39%)' // default
        ],
        'circle-radius': 16,
        'circle-stroke-width': 3,
        'circle-stroke-color': 'hsl(209, 40%, 96%)',
        'circle-opacity': 0.9
      }
    });

    // Click handler for clusters - zoom in
    map.current.on('click', 'clusters', (e) => {
      if (!map.current) return;
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      const clusterId = features[0].properties.cluster_id;
      const source = map.current.getSource('shops') as mapboxgl.GeoJSONSource;
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || !map.current) return;
        map.current.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
          zoom: zoom
        });
      });
    });

    // Click handler for unclustered points - show popup
    map.current.on('click', 'unclustered-point', (e) => {
      if (!map.current || !e.features?.[0]) return;
      
      const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const properties = e.features[0].properties;
      
      // Find the shop by ID
      const shop = shops.find(s => s.id === properties.id);
      if (!shop) return;

      // Create popup
      new mapboxgl.Popup({ offset: 25 })
        .setLngLat(coordinates)
        .setHTML(
          `<div class="p-3 bg-card rounded-lg">
            <h3 class="font-bold text-base mb-2">${properties.name}</h3>
            <p class="text-sm text-muted-foreground mb-1">📍 ${properties.address}, ${properties.city}</p>
            ${properties.phone ? `<p class="text-sm">📞 ${properties.phone}</p>` : ''}
          </div>`
        )
        .addTo(map.current);

      // Trigger onShopClick callback
      if (onShopClick) {
        onShopClick(shop);
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    // Fit map to bounds if there are shops
    if (shops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      shops.forEach(shop => {
        if (shop.latitude && shop.longitude) {
          bounds.extend([shop.longitude, shop.latitude]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
        });
      }
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
