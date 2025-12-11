import { MapPin, Globe, Zap, Heart, Search, User, Shield, Calendar, Store } from "lucide-react";
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
import { ChevronUp } from "lucide-react";
import { ContactAndShareSection } from "@/components/ContactAndShareSection";
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
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  useEffect(() => {
    fetchHomeData();
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const fetchHomeData = async () => {
    try {
      // Fetch upcoming drops first (sorted by release date)
      const upcomingRes = await supabase
        .from('drops')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .gte('release_date', new Date().toISOString())
        .order('release_date', { ascending: true })
        .limit(4);
      
      let displayDrops = upcomingRes.data || [];
      
      // If we don't have 4 upcoming drops, fill with recent ended drops
      if (displayDrops.length < 4) {
        const needed = 4 - displayDrops.length;
        const endedRes = await supabase
          .from('drops')
          .select('*')
          .eq('status', 'ended')
          .order('release_date', { ascending: false })
          .limit(needed);
        
        if (endedRes.data) {
          displayDrops = [...displayDrops, ...endedRes.data];
        }
      }
      
      const [brandsRes, shopsRes] = await Promise.all([
        supabase.from('brands').select('*').eq('is_active', true).limit(6),
        supabase.from('shops_public').select('*').eq('is_active', true).limit(4)
      ]);
      
      setFeaturedDrops(displayDrops);
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
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return <div className="min-h-screen bg-background pb-16">
      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md border-3 border-logo-red flex items-center justify-center">
              <span className="text-logo-red font-bold text-base">H</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">{t('app.name')}</h1>
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

      {/* Hero Banner with Urban Background - Compact */}
      <div className="relative h-[180px] md:h-[320px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${urbanBg})`
      }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        
        <div className="relative h-full flex flex-col items-center justify-center px-4 text-center space-y-1 md:space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-wider text-shadow-strong uppercase">
              HEARDROP
            </h2>
            <p className="text-xs md:text-base text-foreground/90 font-medium text-shadow-strong">
              Your Global Guide Streetwear
            </p>
          </div>
          
          <div className="space-y-0">
            <h3 className="text-sm md:text-xl font-bold text-foreground tracking-wide text-shadow-strong uppercase">
              FIND SHOPS. TRACK DROPS. EXPLORE BRANDS.
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-3 pt-4 pb-6 space-y-6">
        {/* Featured Drops */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide">{t('home.featuredDrops')}</h3>
              <p className="text-xs text-muted-foreground">{t('home.featuredDropsDesc')}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/drops')}>
              {t('home.viewAll')}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search drops..." value={dropSearchQuery} onChange={e => setDropSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
          </div>
          
          {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-28 bg-muted" />
                  <CardContent className="p-2">
                    <div className="h-3 bg-muted rounded mb-1" />
                    <div className="h-2 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>)}
            </div> : filteredDrops.length === 0 ? <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                {dropSearchQuery ? `No drops found matching "${dropSearchQuery}"` : t('home.noFeaturedDrops')}
              </CardContent>
            </Card> : <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredDrops.slice(0, 4).map(drop => <Card key={drop.id} className="overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => navigate(`/drops?highlight=${drop.id}`)}>
                  <div className="relative h-28 bg-muted overflow-hidden">
                    {drop.image_url ? <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Zap className="h-8 w-8 text-muted-foreground" />
                      </div>}
                    <Badge 
                      className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 ${
                        drop.status === 'ended' ? 'bg-muted text-muted-foreground' : 
                        drop.status === 'live' ? 'bg-green-500 text-white' : ''
                      }`}
                    >
                      {drop.status === 'ended' ? 'Ended' : drop.status === 'live' ? 'Live' : 'Upcoming'}
                    </Badge>
                  </div>
                  <CardContent className="p-2">
                    <h4 className="font-semibold text-xs mb-0.5 line-clamp-1">{drop.title}</h4>
                    <div className="flex items-center text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-0.5" />
                      {format(new Date(drop.release_date), 'MMM d')}
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </section>

        {/* Popular Brands */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide">{t('home.popularBrands')}</h3>
              <p className="text-xs text-muted-foreground">{t('home.popularBrandsDesc')}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate('/global-index')}>
              {t('home.viewAll')}
            </Button>
          </div>
          
          {loading ? <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="animate-pulse">
                  <CardContent className="p-2">
                    <div className="aspect-square bg-muted rounded-md mb-1" />
                    <div className="h-2 bg-muted rounded" />
                  </CardContent>
                </Card>)}
            </div> : popularBrands.length === 0 ? <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                {t('home.noBrands')}
              </CardContent>
            </Card> : <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {popularBrands.map(brand => <Card key={brand.id} className="hover:scale-[1.02] transition-transform cursor-pointer bg-card/80" onClick={() => navigate(`/global-index?highlight=${brand.id}`)}>
                  <CardContent className="p-2">
                    <div className="aspect-square bg-foreground/5 rounded-md mb-1 flex items-center justify-center overflow-hidden border border-border">
                      <BrandLogo brand={brand} />
                    </div>
                    <p className="font-medium text-[10px] text-center line-clamp-1">{brand.name}</p>
                    {brand.category && <p className="text-xs text-muted-foreground text-center capitalize">{brand.category}</p>}
                  </CardContent>
                </Card>)}
            </div>}
        </section>

        {/* Nearby Shops */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide">{t('home.shopLocations')}</h3>
              <p className="text-xs text-muted-foreground">{t('home.shopLocationsDesc')}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => navigate('/shop-map')}>
                <Globe className="h-3 w-3 mr-1" />
                Map
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/directions')}>
                {t('home.viewAll')}
              </Button>
            </div>
          </div>
          
          {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse">
                  <CardContent className="p-2">
                    <div className="h-3 bg-muted rounded mb-1" />
                    <div className="h-2 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>)}
            </div> : nearbyShops.length === 0 ? <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                {t('home.noShops')}
              </CardContent>
            </Card> : <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {nearbyShops.map(shop => <Card key={shop.id} className="hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => navigate('/directions')}>
                  <CardContent className="p-2">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Store className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs line-clamp-1">{shop.name}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {shop.city}, {shop.country}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </section>

        {/* Contact and Share Section */}
        <ContactAndShareSection />
      </main>
      
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-40 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-all duration-300"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>;
};
export default Index;