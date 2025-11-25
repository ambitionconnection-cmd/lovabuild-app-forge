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
import urbanBg from "@/assets/urban-bg.jpg";
import { BrandLogo } from "@/components/BrandLogo";
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
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    isAdmin
  } = useIsAdmin();
  const {
    t
  } = useTranslation();
  const [featuredDrops, setFeaturedDrops] = useState<Drop[]>([]);
  const [popularBrands, setPopularBrands] = useState<Brand[]>([]);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropSearchQuery, setDropSearchQuery] = useState("");
  useEffect(() => {
    fetchHomeData();
  }, []);
  const fetchHomeData = async () => {
    try {
      const [dropsRes, brandsRes, shopsRes] = await Promise.all([supabase.from('drops').select('*').eq('is_featured', true).eq('status', 'upcoming').order('release_date', {
        ascending: true
      }).limit(12), supabase.from('brands').select('*').eq('is_active', true).limit(6), supabase.from('shops').select('*').eq('is_active', true).limit(4)]);
      if (dropsRes.data) setFeaturedDrops(dropsRes.data);
      if (brandsRes.data) setPopularBrands(brandsRes.data);
      if (shopsRes.data) setNearbyShops(shopsRes.data);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };
  const filteredDrops = featuredDrops.filter(drop => {
    if (!dropSearchQuery) return true;
    const searchLower = dropSearchQuery.toLowerCase();
    return drop.title.toLowerCase().includes(searchLower) || (drop.description?.toLowerCase().includes(searchLower) ?? false);
  });
  return <div className="min-h-screen bg-background">
      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border-4 border-logo-red flex items-center justify-center">
              <span className="text-logo-red font-bold text-xl">H</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t('app.name')}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
            <LanguageSwitcher />
            {isAdmin && <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} title={t('nav.admin')}>
                <Shield className="w-5 h-5" />
              </Button>}
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner with Urban Background */}
      <div className="relative h-[500px] md:h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${urbanBg})`
      }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        
        <div className="relative h-full flex flex-col items-center justify-center px-4 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-5xl md:text-7xl font-black text-foreground tracking-wider text-shadow-strong uppercase">
              HEARDROP
            </h2>
            <p className="text-lg md:text-2xl text-foreground/90 font-medium text-shadow-strong">
              Your Global Guide Streetwear
            </p>
          </div>
          
          <div className="space-y-1 mt-8">
            <h3 className="text-3xl md:text-5xl font-black text-foreground tracking-wide text-shadow-strong uppercase">
              FIND SHOPS. TRACK DROPS.
            </h3>
            <h3 className="text-3xl md:text-5xl font-black text-foreground tracking-wide text-shadow-strong uppercase">
              EXPLORE BRANDS.
            </h3>
          </div>
          
          <p className="text-base md:text-lg text-foreground/90 font-semibold text-shadow-strong mt-6">
        </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-6 pb-12 space-y-16">
        {/* Quick Navigation - Mobile First */}
        <section>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <NavBlock title={t('nav.directions')} icon={MapPin} to="/directions" variant="directions" />
            
            <NavBlock title={t('nav.globalIndex')} icon={Globe} to="/global-index" variant="global" />
            
            <NavBlock title={t('nav.drops')} icon={Zap} to="/drops" variant="drops" />
            
            <NavBlock title={t('nav.myHeardrop')} icon={Heart} to="/my-heardrop" variant="heardrop" />
          </div>
        </section>

        {/* Featured Drops */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold mb-2 uppercase tracking-wide">{t('home.featuredDrops')}</h3>
              <p className="text-muted-foreground">{t('home.featuredDropsDesc')}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/drops')}>
              {t('home.viewAll')}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search drops..." value={dropSearchQuery} onChange={e => setDropSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
          </div>
          
          {loading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>)}
            </div> : filteredDrops.length === 0 ? <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {dropSearchQuery ? `No drops found matching "${dropSearchQuery}"` : t('home.noFeaturedDrops')}
              </CardContent>
            </Card> : <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredDrops.map(drop => <Card key={drop.id} className="overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => navigate('/drops')}>
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {drop.image_url ? <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Zap className="h-12 w-12 text-muted-foreground" />
                      </div>}
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
                </Card>)}
            </div>}
        </section>

        {/* Popular Brands */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold mb-2 uppercase tracking-wide">{t('home.popularBrands')}</h3>
              <p className="text-muted-foreground">{t('home.popularBrandsDesc')}</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/global-index')}>
              {t('home.viewAll')}
            </Button>
          </div>
          
          {loading ? <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-2" />
                    <div className="h-3 bg-muted rounded" />
                  </CardContent>
                </Card>)}
            </div> : popularBrands.length === 0 ? <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('home.noBrands')}
              </CardContent>
            </Card> : <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {popularBrands.map(brand => <Card key={brand.id} className="hover:scale-[1.02] transition-transform cursor-pointer bg-card/80" onClick={() => navigate('/global-index')}>
                  <CardContent className="p-4">
                    <div className="aspect-square bg-foreground/5 rounded-lg mb-3 flex items-center justify-center overflow-hidden border-2 border-border">
                      <BrandLogo brand={brand} />
                    </div>
                    <p className="font-medium text-sm text-center line-clamp-1">{brand.name}</p>
                    {brand.category && <p className="text-xs text-muted-foreground text-center capitalize">{brand.category}</p>}
                  </CardContent>
                </Card>)}
            </div>}
        </section>

        {/* Nearby Shops */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold mb-2 uppercase tracking-wide">{t('home.shopLocations')}</h3>
              <p className="text-muted-foreground">{t('home.shopLocationsDesc')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/shop-map')}>
                <Globe className="h-4 w-4 mr-2" />
                View Map
              </Button>
              <Button variant="ghost" onClick={() => navigate('/directions')}>
                {t('home.viewAll')}
              </Button>
            </div>
          </div>
          
          {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>)}
            </div> : nearbyShops.length === 0 ? <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('home.noShops')}
              </CardContent>
            </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearbyShops.map(shop => <Card key={shop.id} className="hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => navigate('/directions')}>
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
                        {shop.category && <Badge variant="outline" className="mt-2 text-xs capitalize">
                            {shop.category}
                          </Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </section>
      </main>
    </div>;
};
export default Index;