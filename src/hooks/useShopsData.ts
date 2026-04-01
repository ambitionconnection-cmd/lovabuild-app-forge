import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ShopType = Tables<'shops_public'>;
type BrandType = { id: string; slug: string; name: string; logo_url: string | null; banner_url: string | null; description: string | null; history: string | null; instagram_url: string | null; tiktok_url: string | null; official_website: string | null; country: string | null; category: string | null };

const SHOPS_CACHE_KEY = 'flyaf_shops_cache';
const BRANDS_CACHE_KEY = 'flyaf_brands_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheData<T> {
  data: T;
  timestamp: number;
}

function getFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheData<T> = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T) {
  try {
    const entry: CacheData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full — silently fail
  }
}

/**
 * Progressive shop & brand data loader.
 * 1. Returns cached data instantly from localStorage (if available)
 * 2. Fetches fresh data from network in background
 * 3. Updates state when network data arrives
 */
export function useShopsData() {
  const [shops, setShops] = useState<ShopType[]>([]);
  const [brands, setBrands] = useState<BrandType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<'cache' | 'network' | 'done'>('cache');
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Step 1: Load from localStorage cache instantly
    const cachedShops = getFromCache<ShopType[]>(SHOPS_CACHE_KEY);
    const cachedBrands = getFromCache<BrandType[]>(BRANDS_CACHE_KEY);

    if (cachedShops && cachedBrands) {
      setShops(cachedShops);
      setBrands(cachedBrands);
      setLoading(false);
      setLoadingStage('network');
    } else {
      setLoadingStage('network');
    }

    // Step 2: Fetch fresh data from network
    const fetchFresh = async () => {
      try {
        const [shopsResult, brandsResult] = await Promise.all([
          supabase.from('shops_public').select('*').order('name'),
          supabase.from('brands').select('id, slug, name, logo_url, banner_url, description, history, instagram_url, tiktok_url, official_website, country, category').eq('is_active', true)
        ]);

        if (!shopsResult.error && shopsResult.data) {
          setShops(shopsResult.data);
          setCache(SHOPS_CACHE_KEY, shopsResult.data);
        }
        if (!brandsResult.error && brandsResult.data) {
          setBrands(brandsResult.data);
          setCache(BRANDS_CACHE_KEY, brandsResult.data);
        }
      } catch (err) {
        console.error('Error fetching shops/brands:', err);
      } finally {
        setLoading(false);
        setLoadingStage('done');
      }
    };

    fetchFresh();
  }, []);

  return { shops, brands, loading, loadingStage };
}
