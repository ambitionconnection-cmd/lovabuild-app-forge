import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tables } from '@/integrations/supabase/types';

interface MapProps {
  shops: Omit<Tables<'shops'>, 'email' | 'phone'>[];
  onShopClick?: (shop: Omit<Tables<'shops'>, 'email' | 'phone'>) => void;
  selectedShop?: Omit<Tables<'shops'>, 'email' | 'phone'> | null;
  journeyStops?: Omit<Tables<'shops'>, 'email' | 'phone'>[];
  onRouteUpdate?: (route: any) => void;
  onVisibleShopsChange?: (shops: Omit<Tables<'shops'>, 'email' | 'phone'>[]) => void;
  onMapCenterChange?: (center: { lat: number; lng: number }) => void;
  onCenterOnShop?: (shopId: string) => void;
  initialCenter?: [number, number] | null;
  initialZoom?: number;
  highlightedShopId?: string | null;
  isFullscreen?: boolean;
  deferRouteCalculation?: boolean;
}

const Map: React.FC<MapProps> = ({ 
  shops, 
  onShopClick, 
  selectedShop, 
  journeyStops = [], 
  onRouteUpdate,
  onVisibleShopsChange,
  onMapCenterChange,
  onCenterOnShop,
  initialCenter,
  initialZoom,
  highlightedShopId,
  isFullscreen = false,
  deferRouteCalculation = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const shopsRef = useRef(shops);
  const onShopClickRef = useRef(onShopClick);
  const onVisibleShopsChangeRef = useRef(onVisibleShopsChange);
  const onMapCenterChangeRef = useRef(onMapCenterChange);
  const isUserInteracting = useRef(false);
  const lastRouteKey = useRef<string>('');
  const routeAnimationRef = useRef<number | null>(null);
  const hasInitializedLocation = useRef(false);

  // Keep refs updated
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  useEffect(() => {
    onShopClickRef.current = onShopClick;
  }, [onShopClick]);

  useEffect(() => {
    onVisibleShopsChangeRef.current = onVisibleShopsChange;
  }, [onVisibleShopsChange]);

  useEffect(() => {
    onMapCenterChangeRef.current = onMapCenterChange;
  }, [onMapCenterChange]);

  useEffect(() => {
    setMapboxToken('pk.eyJ1IjoiY2hyaXMtY2FybG9zIiwiYSI6ImNtaWM3MDhpbTBxbHMyanM2ZXdscjZndGoifQ.OhI-E76ufbnm3pQdVzalNQ');
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter || [2.3522, 48.8566],
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

    // Listen for user location - CRITICAL FIX #3: Center map on user location
    geolocateControl.on('geolocate', (e: any) => {
      const newLocation: [number, number] = [e.coords.longitude, e.coords.latitude];
      setUserLocation(newLocation);
      
      // CRITICAL FIX #3: Center on user location on first geolocation
      if (!hasInitializedLocation.current && map.current && !initialCenter) {
        hasInitializedLocation.current = true;
        map.current.flyTo({
          center: newLocation,
          zoom: 14,
          duration: 1000,
        });
      }
      
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
        "></div>
      `;
      
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat(newLocation)
        .addTo(map.current!);
    });

    // Track user interaction to prevent auto-animations - stays true until explicitly reset
    map.current.on('mousedown', () => { isUserInteracting.current = true; });
    map.current.on('touchstart', () => { isUserInteracting.current = true; });
    map.current.on('dragstart', () => { isUserInteracting.current = true; });
    map.current.on('wheel', () => { isUserInteracting.current = true; });

    // CRITICAL FIX #2: Update visible shops and map center on map move (debounced)
    let moveTimeout: ReturnType<typeof setTimeout>;
    const updateVisibleShopsAndCenter = () => {
      if (!map.current) return;
      
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        const bounds = map.current?.getBounds();
        const center = map.current?.getCenter();
        
        // Update map center for distance calculations
        if (center && onMapCenterChangeRef.current) {
          onMapCenterChangeRef.current({ lat: center.lat, lng: center.lng });
        }
        
        // CRITICAL FIX #2: Update visible shops based on viewport, not GPS
        if (bounds && onVisibleShopsChangeRef.current) {
          const visibleShops = shopsRef.current.filter(shop => {
            if (!shop.latitude || !shop.longitude) return false;
            return bounds.contains([Number(shop.longitude), Number(shop.latitude)]);
          });
          
          onVisibleShopsChangeRef.current(visibleShops);
        }
      }, 150); // Reduced debounce for more responsive updates
    };

    map.current.on('moveend', updateVisibleShopsAndCenter);
    map.current.on('zoomend', updateVisibleShopsAndCenter);

    // Wait for map to load, then trigger geolocation
    map.current.on('load', () => {
      // Immediately update visible shops on load
      updateVisibleShopsAndCenter();
      
      setTimeout(() => {
        geolocateControl.trigger();
        map.current?.resize();
      }, 300);
    });

    const handleResize = () => {
      map.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(moveTimeout);
      window.removeEventListener('resize', handleResize);
      if (routeAnimationRef.current) {
        cancelAnimationFrame(routeAnimationRef.current);
      }
      userMarkerRef.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, initialCenter, initialZoom]);

  // Handle fullscreen resize
  useEffect(() => {
    if (map.current) {
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    }
  }, [isFullscreen]);

  // Center on shop via custom event - NO animation loops
  useEffect(() => {
    const handleCenterOnShop = (e: CustomEvent<string>) => {
      const shop = shopsRef.current.find(s => s.id === e.detail);
      if (shop && shop.latitude && shop.longitude && map.current) {
        isUserInteracting.current = false;
        map.current.jumpTo({
          center: [Number(shop.longitude), Number(shop.latitude)],
          zoom: 16,
        });
      }
    };
    
    window.addEventListener('map:centerOnShop' as any, handleCenterOnShop);
    return () => {
      window.removeEventListener('map:centerOnShop' as any, handleCenterOnShop);
    };
  }, []);

  // Fetch and display route when journey stops are selected
  useEffect(() => {
    if (!map.current) return;

    const stopsToUse = journeyStops.length > 0 ? journeyStops : (selectedShop ? [selectedShop] : []);

    // Create a key to check if route actually changed
    const routeKey = stopsToUse.map(s => s.id).join(',') + '|' + (userLocation?.join(',') || '');
    
    // Skip if route hasn't changed
    if (routeKey === lastRouteKey.current && routeKey !== '|') {
      return;
    }
    lastRouteKey.current = routeKey;

    const updateRoute = () => {
      if (!map.current) return;

      // Cancel any ongoing animation
      if (routeAnimationRef.current) {
        cancelAnimationFrame(routeAnimationRef.current);
        routeAnimationRef.current = null;
      }

      if (!userLocation || stopsToUse.length === 0) {
        // Clear route if no stops selected
        if (map.current.getSource('route')) {
          if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
          if (map.current.getLayer('route-line-casing')) map.current.removeLayer('route-line-casing');
          if (map.current.getSource('route')) map.current.removeSource('route');
        }
        if (onRouteUpdate) onRouteUpdate(null);
        return;
      }

      const fetchRoute = async () => {
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

          if (data.routes && data.routes.length > 0 && map.current) {
            const route = data.routes[0];

            const allSteps = route.legs.flatMap((leg: any) => leg.steps);

            if (onRouteUpdate) {
              onRouteUpdate({
                distance: route.distance,
                duration: route.duration,
                steps: allSteps,
                legs: route.legs
              });
            }

            // Remove existing route layers
            if (map.current.getSource('route')) {
              if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
              if (map.current.getLayer('route-line-casing')) map.current.removeLayer('route-line-casing');
              map.current.removeSource('route');
            }

            // Add route source
            map.current.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
              }
            });

            // Add casing (outline) layer
            map.current.addLayer({
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

            // Add main route line - NO animation
            map.current.addLayer({
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

            // Never auto-fit bounds - let user control the map position
            // User can use the recenter button if needed
          }
        } catch (error) {
          console.error('Error fetching route:', error);
        }
      };

      fetchRoute();
    };

    if (map.current.isStyleLoaded()) {
      updateRoute();
    } else {
      map.current.once('style.load', updateRoute);
    }
  }, [journeyStops, selectedShop, userLocation, mapboxToken, onRouteUpdate]);

  // Update shop markers when shops change - CRITICAL FIX: Ensure markers always render
  useEffect(() => {
    if (!map.current) return;
    
    // Wait for shops data
    if (shops.length === 0) {
      console.log('[Map] No shops to display');
      return;
    }

    const addShopsToMap = () => {
      if (!map.current) return;
      
      console.log('[Map] Adding', shops.length, 'shops to map');

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: shops
          .filter(shop => shop.latitude && shop.longitude)
          .map(shop => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [Number(shop.longitude), Number(shop.latitude)]
            },
            properties: {
              id: shop.id,
              name: shop.name,
              address: shop.address,
              city: shop.city,
              category: shop.category || 'streetwear',
              brand_id: shop.brand_id || null,
            }
          }))
      };
      
      console.log('[Map] Created GeoJSON with', geojson.features.length, 'features');

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
            'hsl(186, 95%, 55%)',
            10,
            'hsl(271, 85%, 65%)',
            30,
            'hsl(45, 93%, 58%)'
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
            'hsl(200, 98%, 39%)'
          ],
          'circle-radius': 16,
          'circle-stroke-width': 3,
          'circle-stroke-color': 'hsl(209, 40%, 96%)',
          'circle-opacity': 0.9
        }
      });

      // Click handler for clusters - zoom in, no animation
      map.current.on('click', 'clusters', (e) => {
        if (!map.current) return;
        isUserInteracting.current = true;
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        if (!clusterId) return;
        const source = map.current.getSource('shops') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;
          map.current.jumpTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom
          });
        });
      });

      // Click handler for unclustered points - show popup, center without animation
      map.current.on('click', 'unclustered-point', (e) => {
        if (!map.current || !e.features?.[0]) return;
        
        isUserInteracting.current = true;
        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const properties = e.features[0].properties;
        
        if (!properties) return;
        
        const shop = shopsRef.current.find(s => s.id === properties.id);
        if (!shop) return;

        // Close any existing popups
        const existingPopups = document.querySelectorAll('.mapboxgl-popup');
        existingPopups.forEach(popup => popup.remove());

        // Create improved popup with action buttons
        const popupId = `popup-${shop.id}`;
        const popup = new mapboxgl.Popup({ 
          offset: 25, 
          closeOnClick: false,
          closeButton: false,
          className: 'shop-popup-custom',
          maxWidth: '280px'
        })
          .setLngLat(coordinates)
          .setHTML(
            `<div id="${popupId}" class="shop-popup-card">
              <h3 class="shop-popup-name">${properties.name}</h3>
              <p class="shop-popup-address">📍 ${properties.address}, ${properties.city}</p>
              <div class="shop-popup-actions">
                ${shop.brand_id ? `<button class="shop-popup-btn shop-popup-btn-brand" data-action="brand" data-shop-id="${shop.id}">
                  <span>🏷️</span> BRAND
                </button>` : ''}
                <button class="shop-popup-btn shop-popup-btn-shop" data-action="shop" data-shop-id="${shop.id}">
                  <span>🏪</span> SHOP
                </button>
                <button class="shop-popup-btn shop-popup-btn-add" data-action="add" data-shop-id="${shop.id}">
                  <span>➕</span> ADD TO DIRECTION
                </button>
                <button class="shop-popup-btn shop-popup-btn-close" data-action="close" data-shop-id="${shop.id}">
                  <span>✕</span> CLOSE
                </button>
              </div>
            </div>`
          )
          .addTo(map.current);

        // Add event listeners to popup buttons
        setTimeout(() => {
          const popupEl = document.getElementById(popupId);
          if (popupEl) {
            popupEl.addEventListener('click', (e) => {
              const target = e.target as HTMLElement;
              const button = target.closest('button');
              if (!button) return;
              
              const action = button.dataset.action;
              const shopId = button.dataset.shopId;
              
              if (action === 'close') {
                popup.remove();
              } else if (action === 'brand' && shop.brand_id) {
                window.dispatchEvent(new CustomEvent('map:brandClick', { detail: { brandId: shop.brand_id } }));
              } else if (action === 'shop') {
                window.dispatchEvent(new CustomEvent('map:shopDetails', { detail: { shopId } }));
              } else if (action === 'add') {
                window.dispatchEvent(new CustomEvent('map:addToJourney', { detail: { shopId } }));
                popup.remove();
              }
            });
          }
        }, 50);

        // Center on shop without animation
        map.current.jumpTo({
          center: coordinates,
          zoom: Math.max(map.current.getZoom(), 14)
        });

        if (onShopClickRef.current) {
          onShopClickRef.current(shop);
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

      // CRITICAL: Update visible shops immediately after adding markers
      const bounds = map.current.getBounds();
      if (bounds && onVisibleShopsChangeRef.current) {
        const visibleShops = shops.filter(shop => {
          if (!shop.latitude || !shop.longitude) return false;
          return bounds.contains([Number(shop.longitude), Number(shop.latitude)]);
        });
        console.log('[Map] Initial visible shops:', visibleShops.length);
        onVisibleShopsChangeRef.current(visibleShops);
      }

      // Fit map to bounds if there are shops and no initial center provided
      if (shops.length > 0 && !initialCenter && !isUserInteracting.current) {
        const bounds = new mapboxgl.LngLatBounds();
        shops.forEach(shop => {
          if (shop.latitude && shop.longitude) {
            bounds.extend([Number(shop.longitude), Number(shop.latitude)]);
          }
        });
        
        if (!bounds.isEmpty()) {
          map.current?.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
            duration: 0
          });
        }
      }
      
      console.log('[Map] Shops added successfully');
    };

    // CRITICAL FIX: Ensure we properly wait for style to load
    if (map.current.isStyleLoaded()) {
      addShopsToMap();
    } else {
      console.log('[Map] Waiting for style to load...');
      map.current.once('style.load', () => {
        console.log('[Map] Style loaded, adding shops');
        addShopsToMap();
      });
    }
  }, [shops, initialCenter]);

  // Update highlighted shop styling
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    if (map.current.getLayer('unclustered-point')) {
      map.current.setPaintProperty('unclustered-point', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], highlightedShopId || ''],
        22,
        16
      ]);
      map.current.setPaintProperty('unclustered-point', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id'], highlightedShopId || ''],
        5,
        3
      ]);
      map.current.setPaintProperty('unclustered-point', 'circle-stroke-color', [
        'case',
        ['==', ['get', 'id'], highlightedShopId || ''],
        'hsl(0, 0%, 100%)',
        'hsl(209, 40%, 96%)'
      ]);
    }
  }, [highlightedShopId]);

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
