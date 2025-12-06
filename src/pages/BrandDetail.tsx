import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ExternalLink, Instagram, Store, MapPin, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getCountryFlag } from "@/lib/countryFlags";
import haptic from "@/lib/haptics";
import { format } from "date-fns";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const BrandDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [brand, setBrand] = useState<Tables<'brands'> | null>(null);
  const [shops, setShops] = useState<Tables<'shops'>[]>([]);
  const [drops, setDrops] = useState<(Tables<'drops'> & { brands?: { name: string } | null })[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchBrandData();
    }
  }, [slug, user]);

  const fetchBrandData = async () => {
    setLoading(true);
    
    // Fetch brand by slug
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (brandError || !brandData) {
      console.error('Error fetching brand:', brandError);
      toast.error('Brand not found');
      navigate('/global-index');
      return;
    }

    setBrand(brandData);

    // Fetch shops, drops, and favorite status in parallel
    const [shopsResult, dropsResult, favoriteResult] = await Promise.all([
      supabase
        .from('shops')
        .select('*')
        .eq('brand_id', brandData.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('drops')
        .select('*, brands(name)')
        .eq('brand_id', brandData.id)
        .gte('release_date', new Date().toISOString())
        .order('release_date', { ascending: true })
        .limit(5),
      user ? supabase
        .from('user_favorite_brands')
        .select('id')
        .eq('user_id', user.id)
        .eq('brand_id', brandData.id)
        .maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);

    if (!shopsResult.error) setShops(shopsResult.data || []);
    if (!dropsResult.error) setDrops(dropsResult.data || []);
    if (favoriteResult.data) setIsFavorite(true);

    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!user || !brand) {
      haptic.warning();
      toast.error('Please sign in to favorite brands');
      navigate('/auth');
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorite_brands')
        .delete()
        .eq('user_id', user.id)
        .eq('brand_id', brand.id);

      if (error) {
        haptic.error();
        toast.error('Failed to remove favorite');
      } else {
        setIsFavorite(false);
        haptic.light();
        toast.success('Removed from favorites');
      }
    } else {
      const { error } = await supabase
        .from('user_favorite_brands')
        .insert({ user_id: user.id, brand_id: brand.id });

      if (error) {
        haptic.error();
        toast.error('Failed to add favorite');
      } else {
        setIsFavorite(true);
        haptic.success();
        toast.success('Added to favorites');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
          <div className="container mx-auto px-3 py-2 flex items-center gap-3">
            <Link to="/global-index">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-3 py-4 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </main>
      </div>
    );
  }

  if (!brand) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/global-index">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-base font-bold uppercase tracking-wider line-clamp-1">{brand.name}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFavorite}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 space-y-4">
        {/* Brand Hero Card */}
        <Card className="overflow-hidden bg-gradient-to-br from-muted/50 via-card to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-4">
              {/* Logo */}
              <div className="w-32 h-32 rounded-2xl bg-card border border-border/50 flex items-center justify-center overflow-hidden shadow-lg">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-muted-foreground">{brand.name.charAt(0)}</span>
                )}
              </div>

              {/* Name and Country */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {brand.country && (
                    <span className="text-xl" title={brand.country}>{getCountryFlag(brand.country)}</span>
                  )}
                  <h2 className="text-xl font-bold uppercase tracking-wide">{brand.name}</h2>
                </div>
                {brand.description && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">{brand.description}</p>
                )}
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap justify-center gap-2">
                {brand.official_website && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={() => window.open(brand.official_website!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Website
                  </Button>
                )}
                {brand.instagram_url && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={() => window.open(brand.instagram_url!, '_blank')}
                  >
                    <Instagram className="w-4 h-4 mr-1.5" />
                    Instagram
                  </Button>
                )}
                {brand.tiktok_url && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={() => window.open(brand.tiktok_url!, '_blank')}
                  >
                    <TikTokIcon className="w-4 h-4 mr-1.5" />
                    TikTok
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand History */}
        {brand.history && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wide">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{brand.history}</p>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Drops */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">Upcoming Drops</CardTitle>
              <Badge variant="secondary" className="text-xs">{drops.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {drops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming drops</p>
            ) : (
              <div className="space-y-3">
                {drops.map((drop) => (
                  <div
                    key={drop.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate('/drops')}
                  >
                    <div className="w-12 h-12 rounded-lg bg-card border overflow-hidden flex-shrink-0">
                      {drop.image_url ? (
                        <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{drop.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(drop.release_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <Badge variant={drop.status === 'live' ? 'default' : 'secondary'} className="text-xs">
                      {drop.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shops */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">Stores</CardTitle>
              <Badge variant="secondary" className="text-xs">{shops.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {shops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No stores available</p>
            ) : (
              <div className="space-y-3">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate('/shop-map')}
                  >
                    <div className="w-12 h-12 rounded-lg bg-card border overflow-hidden flex-shrink-0">
                      {shop.image_url ? (
                        <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{shop.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {shop.city}, {shop.country}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BrandDetail;
