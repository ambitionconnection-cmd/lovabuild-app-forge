import { MapPin, Globe, Zap, Heart, Search, User, Shield, Calendar, TrendingUp, Store } from "lucide-react";
import { NavBlock } from "@/components/NavBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface Drop {
  id: string;
  title: string;
  description: string;
  image_url: string;
  release_date: string;
  status: string;
  is_featured: boolean;
  brand_id: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string;
  category: string;
}

interface Shop {
  id: string;
  name: string;
  city: string;
  country: string;
  category: string;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();
  const [featuredDrops, setFeaturedDrops] = useState<Drop[]>([]);
  const [popularBrands, setPopularBrands] = useState<Brand[]>([]);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const [dropsRes, brandsRes, shopsRes] = await Promise.all([
        supabase
          .from('drops')
          .select('*')
          .eq('is_featured', true)
          .eq('status', 'upcoming')
          .order('release_date', { ascending: true })
          .limit(3),
        supabase
          .from('brands')
          .select('*')
          .eq('is_active', true)
          .limit(6),
        supabase
          .from('shops')
          .select('*')
          .eq('is_active', true)
          .limit(4)
      ]);

      if (dropsRes.data) setFeaturedDrops(dropsRes.data);
      if (brandsRes.data) setPopularBrands(brandsRes.data);
      if (shopsRes.data) setNearbyShops(shopsRes.data);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-directions via-drops to-heardrop" />
            <h1 className="text-2xl font-bold tracking-tight">{t('app.name')}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
            <LanguageSwitcher />
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/admin")}
                title={t('nav.admin')}
              >
                <Shield className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative h-[400px] overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=2000')] bg-cover bg-center opacity-20" />
        <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
          <h2 className="text-5xl md:text-7xl font-bold text-foreground tracking-wider mb-4">
            {t('app.name')}
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
            {t('app.tagline')}
          </p>
          <div className="flex gap-4">
            <Button size="lg" onClick={() => navigate('/drops')}>
              <Zap className="mr-2 h-5 w-5" />
              {t('home.explorDrops')}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/directions')}>
              <MapPin className="mr-2 h-5 w-5" />
              {t('home.findShops')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 space-y-16">
        {/* Featured Drops */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold mb-2">{t('home.featuredDrops')}</h3>
              <p className="text-muted-foreground">{t('home.featuredDropsDesc')}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/drops')}>
              {t('home.viewAll')}
            </Button>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredDrops.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('home.noFeaturedDrops')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredDrops.map((drop) => (
                <Card key={drop.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/drops')}>
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {drop.image_url ? (
                      <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Zap className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2">{t('drops.featured')}</Badge>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-lg mb-1 line-clamp-1">{drop.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {drop.description || t('drops.upcoming')}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(drop.release_date), 'MMM d, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Popular Brands */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold mb-2">{t('home.popularBrands')}</h3>
              <p className="text-muted-foreground">{t('home.popularBrandsDesc')}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/global-index')}>
              {t('home.viewAll')}
            </Button>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-2" />
                    <div className="h-3 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : popularBrands.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('home.noBrands')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {popularBrands.map((brand) => (
                <Card key={brand.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/global-index')}>
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                      ) : (
                        <TrendingUp className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-medium text-sm text-center line-clamp-1">{brand.name}</p>
                    {brand.category && (
                      <p className="text-xs text-muted-foreground text-center capitalize">{brand.category}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Nearby Shops */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold mb-2">{t('home.shopLocations')}</h3>
              <p className="text-muted-foreground">{t('home.shopLocationsDesc')}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/directions')}>
              {t('home.viewAll')}
            </Button>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : nearbyShops.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('home.noShops')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearbyShops.map((shop) => (
                <Card key={shop.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/directions')}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold line-clamp-1">{shop.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {shop.city}, {shop.country}
                        </p>
                        {shop.category && (
                          <Badge variant="outline" className="mt-2 text-xs capitalize">
                            {shop.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Quick Navigation */}
        <section>
          <h3 className="text-3xl font-bold mb-6">{t('home.exploreMore')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <NavBlock
              title={t('nav.directions')}
              icon={MapPin}
              to="/directions"
              variant="directions"
            />
            
            <NavBlock
              title={t('nav.globalIndex')}
              icon={Globe}
              to="/global-index"
              variant="global"
            />
            
            <NavBlock
              title={t('nav.drops')}
              icon={Zap}
              to="/drops"
              variant="drops"
            />
            
            <NavBlock
              title={t('nav.myHeardrop')}
              icon={Heart}
              to="/my-heardrop"
              variant="heardrop"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
