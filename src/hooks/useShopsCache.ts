import { useRef, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';

type ShopType = Tables<'shops_public'>;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RouteCache {
  [key: string]: CacheEntry<any>;
}

/**
 * Custom hook for caching shop data and route calculations
 * Implements TTL-based caching to reduce API calls
 */
export function useShopsCache() {
  const shopsCacheRef = useRef<CacheEntry<ShopType[]> | null>(null);
  const routeCacheRef = useRef<RouteCache>({});
  const viewportCacheRef = useRef<Map<string, ShopType[]>>(new Map());

  // Cache TTL values in milliseconds
  const SHOPS_TTL = 30 * 60 * 1000; // 30 minutes for shop data (rarely changes)
  const ROUTE_TTL = 5 * 60 * 1000;   // 5 minutes for route data
  const VIEWPORT_TTL = 2 * 60 * 1000; // 2 minutes for viewport calculations

  /**
   * Check if a cache entry is still valid
   */
  const isValid = <T,>(entry: CacheEntry<T> | null): boolean => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.ttl;
  };

  /**
   * Get cached shops data
   */
  const getCachedShops = useCallback((): ShopType[] | null => {
    if (isValid(shopsCacheRef.current)) {
      return shopsCacheRef.current!.data;
    }
    return null;
  }, []);

  /**
   * Set shops cache
   */
  const setCachedShops = useCallback((shops: ShopType[]) => {
    shopsCacheRef.current = {
      data: shops,
      timestamp: Date.now(),
      ttl: SHOPS_TTL,
    };
  }, []);

  /**
   * Generate a unique key for route caching
   */
  const getRouteKey = useCallback((
    userLocation: [number, number] | null,
    stops: Array<{ id: string; latitude?: number | null; longitude?: number | null }>
  ): string => {
    const locationKey = userLocation ? `${userLocation[0].toFixed(4)},${userLocation[1].toFixed(4)}` : 'no-location';
    const stopsKey = stops
      .filter(s => s.latitude && s.longitude)
      .map(s => s.id)
      .join('-');
    return `${locationKey}:${stopsKey}`;
  }, []);

  /**
   * Get cached route data
   */
  const getCachedRoute = useCallback((
    userLocation: [number, number] | null,
    stops: Array<{ id: string; latitude?: number | null; longitude?: number | null }>
  ): any | null => {
    const key = getRouteKey(userLocation, stops);
    const entry = routeCacheRef.current[key];
    if (isValid(entry)) {
      return entry.data;
    }
    // Clean up expired entry
    if (entry) {
      delete routeCacheRef.current[key];
    }
    return null;
  }, [getRouteKey]);

  /**
   * Set route cache
   */
  const setCachedRoute = useCallback((
    userLocation: [number, number] | null,
    stops: Array<{ id: string; latitude?: number | null; longitude?: number | null }>,
    routeData: any
  ) => {
    const key = getRouteKey(userLocation, stops);
    routeCacheRef.current[key] = {
      data: routeData,
      timestamp: Date.now(),
      ttl: ROUTE_TTL,
    };
  }, [getRouteKey]);

  /**
   * Generate viewport cache key
   */
  const getViewportKey = useCallback((bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): string => {
    // Round to 3 decimal places for reasonable precision
    return `${bounds.north.toFixed(3)},${bounds.south.toFixed(3)},${bounds.east.toFixed(3)},${bounds.west.toFixed(3)}`;
  }, []);

  /**
   * Get shops visible in viewport from cache
   */
  const getCachedViewportShops = useCallback((bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): ShopType[] | null => {
    const key = getViewportKey(bounds);
    return viewportCacheRef.current.get(key) || null;
  }, [getViewportKey]);

  /**
   * Cache viewport shops
   */
  const setCachedViewportShops = useCallback((
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    shops: ShopType[]
  ) => {
    const key = getViewportKey(bounds);
    viewportCacheRef.current.set(key, shops);
    
    // Limit cache size to prevent memory issues
    if (viewportCacheRef.current.size > 50) {
      const firstKey = viewportCacheRef.current.keys().next().value;
      viewportCacheRef.current.delete(firstKey);
    }
  }, [getViewportKey]);

  /**
   * Clear all caches
   */
  const clearCache = useCallback(() => {
    shopsCacheRef.current = null;
    routeCacheRef.current = {};
    viewportCacheRef.current.clear();
  }, []);

  /**
   * Clear only route cache (useful when user location changes significantly)
   */
  const clearRouteCache = useCallback(() => {
    routeCacheRef.current = {};
  }, []);

  return {
    getCachedShops,
    setCachedShops,
    getCachedRoute,
    setCachedRoute,
    getCachedViewportShops,
    setCachedViewportShops,
    clearCache,
    clearRouteCache,
  };
}

export default useShopsCache;
