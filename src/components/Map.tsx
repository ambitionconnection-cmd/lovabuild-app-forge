import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tables } from '@/integrations/supabase/types';

interface MapProps {
  shops: Omit<Tables<'shops'>, 'email' | 'phone'>[];
  onShopClick?: (shop: Omit<Tables<'shops'>, 'email' | 'phone'>) => void;
  selectedShop?: Omit<Tables<'shops'>, 'email' | 'phone'> | null;
  journeyStops?: Omit<Tables<'shops'>, 'email' | 'phone'>[];
  onRouteUpdate?: (route: any) => void;
  initialCenter?: [number, number] | null;
  initialZoom?: number;
  highlightedShopId?: string | null;
}

const Map: React.FC<MapProps> = ({ 
  shops, 
  onShopClick, 
  selectedShop, 
  journeyStops = [], 
  onRouteUpdate,
  initialCenter,
  initialZoom,
  highlightedShopId
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

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
      center: initialCenter || [2.3522, 48.8566], // Use provided center or default to Paris
      zoom: initialZoom || 12,
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

    // Listen for user location
    geolocateControl.on('geolocate', (e: any) => {
      setUserLocation([e.coords.longitude, e.coords.latitude]);
      
      // Add custom user location marker
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }
      
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: hsl(186, 95%, 55%);
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></div>
      `;
      
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([e.coords.longitude, e.coords.latitude])
        .addTo(map.current!);
    });

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
      userMarkerRef.current?.remove();
      map.current?.remove();
    };
  }, [mapboxToken, initialCenter, initialZoom]);

  // Fetch and display route when journey stops are selected
  useEffect(() => {
    const stopsToUse = journeyStops.length > 0 ? journeyStops : (selectedShop ? [selectedShop] : []);
    
    if (!map.current || !userLocation || stopsToUse.length === 0) {
      // Clear route if no stops selected
      if (map.current?.getSource('route')) {
        if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
        if (map.current.getLayer('route-line-casing')) map.current.removeLayer('route-line-casing');
        if (map.current.getSource('route')) map.current.removeSource('route');
      }
      return;
    }

    const fetchRoute = async () => {
      // Build waypoints: user location + all journey stops
      const waypoints = [
        `${userLocation[0]},${userLocation[1]}`,
        ...stopsToUse
          .filter(stop => stop.latitude && stop.longitude)
          .map(stop => `${stop.longitude},${stop.latitude}`)
      ].join(';');
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${waypoints}?geometries=geojson&steps=true&access_token=${mapboxToken}`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          // Combine all steps from all legs for multi-stop journey
          const allSteps = route.legs.flatMap((leg: any) => leg.steps);
          
          // Notify parent component about route
          if (onRouteUpdate) {
            onRouteUpdate({
              distance: route.distance,
              duration: route.duration,
              steps: allSteps,
              legs: route.legs
            });
          }

          // Remove existing route layers
          if (map.current?.getSource('route')) {
            if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
            if (map.current.getLayer('route-line-casing')) map.current.removeLayer('route-line-casing');
            map.current.removeSource('route');
          }

          // Add route source
          map.current?.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });

          // Add casing (outline) layer
          map.current?.addLayer({
            id: 'route-line-casing',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': 10,
              'line-opacity': 0.8
            }
          });

          // Add main route line with animation
          map.current?.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': 'hsl(186, 95%, 55%)',
              'line-width': 6,
              'line-opacity': 0.9
            }
          });

          // Animate route drawing
          let animationFrame = 0;
          const totalFrames = 60;
          
          const animateRoute = () => {
            if (animationFrame <= totalFrames) {
              const progress = animationFrame / totalFrames;
              map.current?.setPaintProperty('route-line', 'line-dasharray', [
                progress * route.geometry.coordinates.length,
                (1 - progress) * route.geometry.coordinates.length
              ]);
              animationFrame++;
              requestAnimationFrame(animateRoute);
            } else {
              // Remove dash array after animation completes
              map.current?.setPaintProperty('route-line', 'line-dasharray', null);
            }
          };
          
          animateRoute();

          // Fit map to show route
          const coordinates = route.geometry.coordinates;
          const bounds = coordinates.reduce(
            (bounds: mapboxgl.LngLatBounds, coord: [number, number]) => bounds.extend(coord),
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );
          
          map.current?.fitBounds(bounds, {
            padding: 80,
            maxZoom: 15,
            duration: 1000
          });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [journeyStops, selectedShop, userLocation, mapboxToken, onRouteUpdate]);

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
        'circle-radius': [
          'case',
          ['==', ['get', 'id'], highlightedShopId || ''],
          22, // Larger size for highlighted shop
          16  // Normal size
        ],
        'circle-stroke-width': [
          'case',
          ['==', ['get', 'id'], highlightedShopId || ''],
          5,  // Thicker stroke for highlighted shop
          3   // Normal stroke
        ],
        'circle-stroke-color': [
          'case',
          ['==', ['get', 'id'], highlightedShopId || ''],
          'hsl(0, 0%, 100%)', // White stroke for highlighted shop
          'hsl(209, 40%, 96%)' // Normal stroke color
        ],
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

      // Create popup (contact info hidden for security)
      new mapboxgl.Popup({ offset: 25 })
        .setLngLat(coordinates)
        .setHTML(
          `<div class="p-3 bg-card rounded-lg">
            <h3 class="font-bold text-base mb-2">${properties.name}</h3>
            <p class="text-sm text-muted-foreground mb-1">📍 ${properties.address}, ${properties.city}</p>
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

    // Fit map to bounds if there are shops and no initial center provided
    if (shops.length > 0 && !initialCenter) {
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
  }, [shops, onShopClick, highlightedShopId, initialCenter]);

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
