import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getCountryFlag } from '@/lib/countryFlags';

interface FeaturedBrand {
  id: string;
  brand_id: string;
  description: string | null;
  brands: {
    name: string;
    slug: string;
    logo_url: string | null;
    country: string | null;
    category: string | null;
  };
}

export const BrandOfTheWeek = () => {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<FeaturedBrand | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('heardrop_botw_dismissed')) {
      setDismissed(true);
      return;
    }

    const fetchFeatured = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await (supabase
        .from('featured_brands') as any)
        .select('id, brand_id, description, brands(name, slug, logo_url, country, category)')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setFeatured(data as FeaturedBrand);
    };

    fetchFeatured();
  }, []);

  if (dismissed || !featured) return null;

  const brand = featured.brands;

  const handleDismiss = () => {
    sessionStorage.setItem('heardrop_botw_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-sm lg:left-auto lg:right-4 lg:translate-x-0 lg:top-20">
      <div className="relative bg-card/95 backdrop-blur-xl border border-[#C4956A]/30 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-3 p-3">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl bg-logo-bg border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="max-w-full max-h-full object-contain p-1" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">{brand.name.charAt(0)}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Star className="w-3 h-3 text-[#C4956A] fill-[#C4956A]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C4956A]">Brand of the Week</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">
              {brand.name}
              {brand.country && <span className="ml-1.5 text-xs">{getCountryFlag(brand.country)}</span>}
            </p>
            {featured.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{featured.description}</p>
            )}
          </div>

          {/* CTA */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={() => navigate(`/brand/${brand.slug}`)}
          >
            <ArrowRight className="w-4 h-4 text-[#C4956A]" />
          </Button>
        </div>
      </div>
    </div>
  );
};
