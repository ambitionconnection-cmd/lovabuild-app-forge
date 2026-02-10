import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tables } from '@/integrations/supabase/types';
import { Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MapLoadingOverlay from '@/components/MapLoadingOverlay';
// Debug mode - enable via URL param ?mapDebug=true or localStorage
const getDebugMode = () => {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mapDebug') === 'true') {
    localStorage.setItem('mapDebug', 'true');
    return true;
  }
  return localStorage.getItem('mapDebug') === 'true';
};

const DEBUG_MAP = getDebugMode();

// Debug logger with emoji prefixes
const mapLog = {
  init: (...args: any[]) => DEBUG_MAP && console.log('🗺️ [Init]', ...args),
  shops: (...args: any[]) => DEBUG_MAP && console.log('🏪 [Shops]', ...args),
  location: (...args: any[]) => DEBUG_MAP && console.log('📍 [Location]', ...args),
  layers: (...args: any[]) => DEBUG_MAP && console.log('🎨 [Layers]', ...args),
  events: (...args: any[]) => DEBUG_MAP && console.log('👆 [Events]', ...args),
  route: (...args: any[]) => DEBUG_MAP && console.log('🛤️ [Route]', ...args),
  warn: (...args: any[]) => DEBUG_MAP && console.warn('⚠️ [Map]', ...args),
  error: (...args: any[]) => console.error('❌ [Map]', ...args),
};

interface MapProps {
  shops: Omit<Tables<'shops'>, 'email' | 'phone'>[];
  brands?: { id: string; slug: string; name: string; logo_url: string | null }[];
  onShopClick?: (shop: Omit<Tables<'shops'>, 'email' | 'phone'>) => void;
  selectedShop?: Omit<Tables<'shops'>, 'email' | 'phone'> | null;
  journeyStops?: Omit<Tables<'shops'>, 'email' | 'phone'>[];
  onRouteUpdate?: (route: any) => void;
  onVisibleShopsChange?: (shops: Omit<Tables<'shops'>, 'email' | 'phone'>[]) => void;
  onMapCenterChange?: (center: { lat: number; lng: number; zoom: number }) => void;
  onCenterOnShop?: (shopId: string) => void;
  initialCenter?: [number, number] | null;
  initialZoom?: number;
  highlightedShopId?: string | null;
  isFullscreen?: boolean;
  deferRouteCalculation?: boolean;
  showGeolocateTooltip?: boolean;
}

const Map: React.FC<MapProps> = ({ 
  shops,
  brands = [], 
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
  deferRouteCalculation = true,
  showGeolocateTooltip = false
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing map...');
  const [showTooltip, setShowTooltip] = useState(false);
  const [debugStats, setDebugStats] = useState({ shopsTotal: 0, shopsVisible: 0, sourceReady: false });
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const logoMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const shopsRef = useRef(shops);
  const brandsRef = useRef(brands);
  const onShopClickRef = useRef(onShopClick);
  const onVisibleShopsChangeRef = useRef(onVisibleShopsChange);
  const onMapCenterChangeRef = useRef(onMapCenterChange);
  const isUserInteracting = useRef(false);
  const lastRouteKey = useRef<string>('');
  const routeAnimationRef = useRef<number | null>(null);
  const hasInitializedLocation = useRef(false);
  const tooltipShownRef = useRef(false);

  // Keep refs updated
  useEffect(() => {
    shopsRef.current = shops;
  }, [shops]);

  useEffect(() => {
    onShopClickRef.current = onShopClick;
  }, [onShopClick]);

  useEffect(() => {
  brandsRef.current = brands;
  }, [brands]);
  useEffect(() => {
    onVisibleShopsChangeRef.current = onVisibleShopsChange;
  }, [onVisibleShopsChange]);

  useEffect(() => {
    onMapCenterChangeRef.current = onMapCenterChange;
  }, [onMapCenterChange]);

  useEffect(() => {
    mapLog.init('Debug mode enabled:', DEBUG_MAP);
    setMapboxToken('pk.eyJ1IjoiY2hyaXMtY2FybG9zIiwiYSI6ImNtaWM3MDhpbTBxbHMyanM2ZXdscjZndGoifQ.OhI-E76ufbnm3pQdVzalNQ');
  }, []);

  // Store initial values in refs so they don't cause re-renders
  const initialCenterRef = useRef(initialCenter);
  const initialZoomRef = useRef(initialZoom);

  // Update refs when props change
    useEffect(() => {
      if (initialCenter) {
        initialCenterRef.current = initialCenter;
        // Fly to new center if map exists
        if (map.current) {
          map.current.flyTo({
            center: initialCenter,
            zoom: initialZoom || 15,
            duration: 1000
          });
        }
      }
    }, [initialCenter, initialZoom]);
  // Initialize map once - CRITICAL: Only depend on mapboxToken to prevent re-initialization
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapLog.init('Starting map initialization');
    mapLog.init('Initial center:', initialCenterRef.current, 'Initial zoom:', initialZoomRef.current);
    
    mapboxgl.accessToken = mapboxToken;
    
    // FIXED: Default to London (popular shop area) - shops data may not be loaded yet
    // The map will re-center when shops load via the separate useEffect below
    const startCenter: [number, number] = initialCenterRef.current || [-0.1276, 51.5074];
    const startZoom = initialCenterRef.current ? (initialZoomRef.current || 15) : 10;
    
    mapLog.init('Using startCenter:', startCenter, 'startZoom:', startZoom);
    
    // Mark as initialized if we have a specific target location
    if (initialCenterRef.current) {
      hasInitializedLocation.current = true;
      tooltipShownRef.current = true;
      setTimeout(() => {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 5000);
      }, 1000);
    }
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: startCenter,
      zoom: startZoom,
    });
    
    mapLog.init('Map instance created');

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add geolocate control - CRITICAL FIX #3: Disable trackUserLocation to prevent snap-back
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: false, // DISABLED: Prevents map from snapping back to user location
      showUserHeading: false,
      showAccuracyCircle: false,
    });
    
    map.current.addControl(geolocateControl, 'top-right');

    // Listen for user location - Only center on first load if no initialCenter provided
    geolocateControl.on('geolocate', (e: any) => {
      const newLocation: [number, number] = [e.coords.longitude, e.coords.latitude];
      mapLog.location('Geolocate success:', newLocation);
      mapLog.location('hasInitializedLocation:', hasInitializedLocation.current, 'initialCenter:', !!initialCenterRef.current);
      setUserLocation(newLocation);
      
      // CRITICAL FIX #2: Only center on user location on FIRST geolocation AND only if no specific shop target
      if (!hasInitializedLocation.current && map.current && !initialCenterRef.current) {
        hasInitializedLocation.current = true;
        mapLog.location('Flying to user location (first geolocate)');
        map.current.flyTo({
          center: newLocation,
          zoom: 14,
          duration: 1000,
        });
      } else {
        mapLog.location('NOT flying to user location (already initialized or has initialCenter)');
      }
      
      // Update user marker (blue dot)
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
      mapLog.location('User marker added');
    });
    
    geolocateControl.on('error', (e: any) => {
      mapLog.warn('Geolocate error:', e.message || e);
    });

    // Track user interaction and show tooltip when user navigates away
    const handleUserInteraction = () => {
      isUserInteracting.current = true;
      // Show tooltip once when user first navigates away (after location acquired)
      if (hasInitializedLocation.current && !tooltipShownRef.current) {
        tooltipShownRef.current = true;
        setShowTooltip(true);
        // Auto-hide after 4 seconds
        setTimeout(() => setShowTooltip(false), 4000);
      }
    };
    
    map.current.on('mousedown', handleUserInteraction);
    map.current.on('touchstart', handleUserInteraction);
    map.current.on('dragstart', handleUserInteraction);
    map.current.on('wheel', handleUserInteraction);

    // CRITICAL FIX #2: Update visible shops and map center on map move (debounced)
    let moveTimeout: ReturnType<typeof setTimeout>;
    const updateVisibleShopsAndCenter = () => {
      if (!map.current) return;
      
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        const bounds = map.current?.getBounds();
        const center = map.current?.getCenter();
        
        // Update map center and zoom for distance calculations and persistence
        if (center && onMapCenterChangeRef.current) {
          const zoom = map.current?.getZoom() || 12;
          onMapCenterChangeRef.current({ lat: center.lat, lng: center.lng, zoom });
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
      mapLog.init('Map load event fired');
      // Immediately update visible shops on load
      updateVisibleShopsAndCenter();
      
      setTimeout(() => {
        mapLog.location('Triggering geolocate control');
        geolocateControl.trigger();
        map.current?.resize();
      }, 300);
    });
    
    map.current.on('style.load', () => {
      mapLog.init('Style load event fired');
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
  }, [mapboxToken]); // CRITICAL: Only depend on mapboxToken - initialCenter/initialZoom are captured in refs

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

  // CRITICAL FIX: Set up map event listeners ONCE when map is ready
  // This prevents duplicate handlers on mobile
  useEffect(() => {
    if (!map.current) return;
    
    const setupEventListeners = () => {
      if (!map.current) return;
      
      mapLog.events('Setting up event listeners');
      
      // Click handler for clusters - zoom in, no animation
      map.current.on('click', 'clusters', (e) => {
        if (!map.current) return;
        mapLog.events('Cluster clicked');
        isUserInteracting.current = true;
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        if (!features.length) {
          mapLog.warn('Cluster click: no features found');
          return;
        }
        const clusterId = features[0].properties?.cluster_id;
        if (!clusterId) {
          mapLog.warn('Cluster click: no cluster_id');
          return;
        }
        const source = map.current.getSource('shops') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) {
            mapLog.error('Cluster expansion error:', err);
            return;
          }
          mapLog.events('Expanding cluster to zoom:', zoom);
          map.current.jumpTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom
          });
        });
      });

      // Click handler for unclustered points - show popup, center without animation
      map.current.on('click', 'unclustered-point', (e) => {
        if (!map.current || !e.features?.[0]) return;
        mapLog.events('Unclustered point clicked');
        
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
      
      mapLog.events('All event listeners set up successfully');
    };
    
    // CRITICAL FIX: More robust map ready detection with multiple fallbacks
    const attemptSetup = () => {
      if (!map.current) return;
      
      // Check multiple conditions for map readiness
      const isLoaded = map.current.loaded();
      const isStyleLoaded = map.current.isStyleLoaded();
      
      mapLog.events('Map ready check - loaded:', isLoaded, 'styleLoaded:', isStyleLoaded);
      
      if (isLoaded && isStyleLoaded) {
        setupEventListeners();
      } else if (isLoaded) {
        // Map loaded but style not ready - wait for style
        map.current.once('style.load', setupEventListeners);
      } else {
        // Map not loaded - wait for load, then check style
        map.current.once('load', () => {
          if (map.current?.isStyleLoaded()) {
            setupEventListeners();
          } else {
            map.current?.once('style.load', setupEventListeners);
          }
        });
      }
    };
    
    
    attemptSetup();
  }, [mapboxToken]); // Only run once when map is created

  // CRITICAL FIX: Re-center map on shops centroid when shops first load
  const hasRecenteredOnShops = useRef(false);
  
  useEffect(() => {
    if (!map.current || shops.length === 0 || hasRecenteredOnShops.current) return;
    if (initialCenterRef.current) return; // Don't recenter if we have a specific target
    
    const shopsWithCoords = shops.filter(s => s.latitude && s.longitude);
    if (shopsWithCoords.length === 0) return;
    
    // Calculate centroid of all shops
    const avgLng = shopsWithCoords.reduce((sum, s) => sum + Number(s.longitude), 0) / shopsWithCoords.length;
    const avgLat = shopsWithCoords.reduce((sum, s) => sum + Number(s.latitude), 0) / shopsWithCoords.length;
    
    mapLog.init('Re-centering map on shops centroid:', [avgLng, avgLat], 'from', shopsWithCoords.length, 'shops');
    hasRecenteredOnShops.current = true;
    
    // Fly to shops area (only if user hasn't interacted yet)
    if (!hasInitializedLocation.current && !isUserInteracting.current) {
      map.current.flyTo({
        center: [avgLng, avgLat],
        zoom: 5, // Overview zoom to show multiple shops
        duration: 1500
      });
    }
  }, [shops]);

  // Update shop markers when shops change - CRITICAL FIX: Robust layer creation with retries
  useEffect(() => {
    if (!map.current) {
      mapLog.shops('Map not ready, skipping shops update');
      return;
    }
    
    mapLog.shops('Shops effect triggered, count:', shops.length);
    setDebugStats(prev => ({ ...prev, shopsTotal: shops.length }));
    
    if (shops.length === 0) {
      mapLog.warn('No shops to display');
      setLoadingMessage('Fetching shop data...');
      return;
    }
    // Helper function to create a logo marker element
    const createLogoMarkerElement = (shop: typeof shops[0], logoUrl: string | null) => {
      const el = document.createElement('div');
      el.className = 'logo-marker';
      el.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        pointer-events: none;
        overflow: hidden;
        background-color: hsl(271, 85%, 65%);
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      if (logoUrl) {
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = shop.name;
        img.style.cssText = `
          width: 100%;
          height: 100%;
          object-fit: cover;
        `;
        img.onerror = () => {
          // Fallback to letter if image fails
          el.innerHTML = `<span style="color: white; font-weight: bold; font-size: 14px;">${shop.name.charAt(0)}</span>`;
        };
        el.appendChild(img);
      } else {
        // No logo - show first letter
        el.innerHTML = `<span style="color: white; font-weight: bold; font-size: 14px;">${shop.name.charAt(0)}</span>`;
      }
      
      return el;
    };

  setLoadingMessage('Placing pins on map...');

    const updateShopsData = () => {
      if (!map.current) {
        mapLog.warn('Map disappeared during updateShopsData');
        return;
      }

      mapLog.shops('Updating shops data:', shops.length, 'shops');

      const shopsWithCoords = shops.filter(shop => shop.latitude && shop.longitude);
      mapLog.shops('Shops with coordinates:', shopsWithCoords.length, '/', shops.length);

      if (shopsWithCoords.length === 0) {
        mapLog.warn('No shops have valid coordinates!');
        return;
      }

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: shopsWithCoords.map(shop => {
          // Find the brand to get logo_url
        const brand = shop.brand_id ? brandsRef.current.find(b => b.id === shop.brand_id) : null;
        const logoUrl = brand?.logo_url || shop.image_url || null;
    
        return {
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
            logo_url: logoUrl,
          }
        };
      })
    };

      mapLog.shops('Created GeoJSON with', geojson.features.length, 'features');

      try {
        // Check if source already exists - just update data
        const existingSource = map.current.getSource('shops') as mapboxgl.GeoJSONSource;
        if (existingSource) {
          mapLog.layers('Source exists, updating data');
          existingSource.setData(geojson);
        } else {
          mapLog.layers('Creating new source and layers');

          // Add source with clustering
          map.current.addSource('shops', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });
          mapLog.layers('Source "shops" added');

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
          mapLog.layers('Layer "clusters" added');

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
          mapLog.layers('Layer "cluster-count" added');

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
          mapLog.layers('Layer "unclustered-point" added');

          // Add shop name initials on top of pins
          map.current.addLayer({
            id: 'shop-labels',
            type: 'symbol',
            source: 'shops',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'text-field': ['slice', ['get', 'name'], 0, 1],
              'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'text-allow-overlap': true,
            },
            paint: {
              'text-color': '#ffffff',
            }
          });
          mapLog.layers('Layer "shop-labels" added');

          // Hide the circle layer - we'll use logo markers instead
          // Make circles transparent but keep them clickable for popup functionality
          map.current.setPaintProperty('unclustered-point', 'circle-opacity', 0);
          map.current.setPaintProperty('unclustered-point', 'circle-stroke-opacity', 0);
          map.current.setLayoutProperty('shop-labels', 'visibility', 'none');
                    // Create logo markers for each shop
          shopsWithCoords.forEach(shop => {
            const brand = shop.brand_id ? brandsRef.current.find(b => b.id === shop.brand_id) : null;
            const logoUrl = brand?.logo_url || null;
            
            const el = createLogoMarkerElement(shop, logoUrl);
            
                        
            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([Number(shop.longitude), Number(shop.latitude)])
              .addTo(map.current!);
            
            logoMarkersRef.current[shop.id] = marker;
          });
          
          mapLog.layers('Logo markers added:', Object.keys(logoMarkersRef.current).length);
        }

        setDebugStats(prev => ({ ...prev, sourceReady: true }));

        // Update visible shops immediately after adding/updating markers
        const bounds = map.current.getBounds();
        if (bounds && onVisibleShopsChangeRef.current) {
          const visibleShops = shops.filter(shop => {
            if (!shop.latitude || !shop.longitude) return false;
            return bounds.contains([Number(shop.longitude), Number(shop.latitude)]);
          });
          mapLog.shops('Visible shops in viewport:', visibleShops.length);
          setDebugStats(prev => ({ ...prev, shopsVisible: visibleShops.length }));
          onVisibleShopsChangeRef.current(visibleShops);
        }

        setIsLoadingShops(false);
        mapLog.shops('✅ Shops data updated successfully');
      } catch (error) {
        mapLog.error('Error adding map layers:', error);
        setIsLoadingShops(false);
      }
    };

    // BULLETPROOF MAP READY CHECK
    // Single, clear strategy: check if ready now, if not, wait for the right event
    const ensureMapReadyThenUpdate = () => {
      if (!map.current) {
        mapLog.warn('Map not available yet');
        return;
      }

      const isLoaded = map.current.loaded();
      const isStyleLoaded = map.current.isStyleLoaded();
      mapLog.layers('Map ready check - loaded:', isLoaded, 'styleLoaded:', isStyleLoaded);

      if (isLoaded && isStyleLoaded) {
        // Map is fully ready - add pins immediately
        mapLog.layers('Map is ready, adding pins now');
        updateShopsData();
        return;
      }

      // Map is NOT ready - set up a single listener and wait
      mapLog.layers('Map not ready, waiting for idle event...');

      const onIdle = () => {
        mapLog.layers('Map idle event fired, adding pins now');
        updateShopsData();
      };

      // 'idle' fires after the map has finished loading AND rendering
      // This is the most reliable single event to wait for
      map.current.once('idle', onIdle);

      // Safety net: if idle never fires within 5 seconds, force the update
      const safetyTimeout = setTimeout(() => {
        if (!map.current) return;
        // Remove the idle listener to prevent double-firing
        map.current.off('idle', onIdle);
        mapLog.warn('Safety timeout reached (5s), forcing pin update');
        updateShopsData();
      }, 5000);

      // Clean up timeout if idle fires first
      const originalOnIdle = onIdle;
      const wrappedOnIdle = () => {
        clearTimeout(safetyTimeout);
        originalOnIdle();
      };
      map.current.off('idle', onIdle);
      map.current.once('idle', wrappedOnIdle);
    };

    ensureMapReadyThenUpdate();
  }, [shops]);

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

  // Recenter on user location
  const handleRecenter = useCallback(() => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 14,
        duration: 1000,
      });
    }
  }, [userLocation]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg shadow-lg" />
      
      {/* Loading overlay */}
      <MapLoadingOverlay 
        isLoading={isLoadingShops} 
        shopsCount={shops.length}
        message={loadingMessage}
      />
      
      {/* Recenter button */}
      {userLocation && (
        <Button
          onClick={handleRecenter}
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 z-10 h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm border border-directions/30 hover:bg-directions/20 hover:border-directions"
          title="Recenter on my location"
        >
          <Crosshair className="h-5 w-5 text-directions" />
        </Button>
      )}
      
      {/* Debug overlay - only shown when debug mode is enabled */}
      {DEBUG_MAP && (
        <div className="absolute top-2 left-2 z-20 bg-background/90 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span>🗺️</span>
            <span>Shops: {debugStats.shopsTotal}</span>
            <span className="text-muted-foreground">|</span>
            <span>Visible: {debugStats.shopsVisible}</span>
            <span className="text-muted-foreground">|</span>
            <span>Source: {debugStats.sourceReady ? '✓' : '✗'}</span>
          </div>
        </div>
      )}
      {/* Geolocate tooltip */}
      {showTooltip && (
        <div 
          className="absolute top-[140px] right-2 z-10 animate-in fade-in slide-in-from-right-2 duration-300"
          onClick={() => setShowTooltip(false)}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-directions/30 rounded-lg px-3 py-2 shadow-lg max-w-[180px]">
            <div className="flex items-start gap-2">
              <span className="text-directions text-lg">↑</span>
              <p className="text-xs text-foreground/90">
                Tap the location button to return to your current position
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
