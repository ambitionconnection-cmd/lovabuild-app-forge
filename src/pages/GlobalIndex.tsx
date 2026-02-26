import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Search, ExternalLink, Instagram, Store, ChevronDown, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ShopListModal from "@/components/ShopListModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getCountryFlag } from "@/lib/countryFlags";
import { useTranslation } from "react-i18next";
import haptic from "@/lib/haptics";
import { TikTokIcon } from "@/components/icons/TikTokIcon";

const GlobalIndex = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [brands, setBrands] = useState<Tables<'brands'>[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Tables<'brands'>[]>([]);
  const [favoriteBrands, setFavoriteBrands] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [selectedBrandForShops, setSelectedBrandForShops] = useState<{ id: string; name: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [highlightedBrand, setHighlightedBrand] = useState<string | null>(highlightId);

  // Fetch brands and user favorites
  useEffect(() => {
    fetchBrands();
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  // Scroll to highlighted brand after loading
  useEffect(() => {
    if (!loading && highlightId) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.querySelector(`[data-brand-id="${highlightId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Clear highlight after animation
          setTimeout(() => setHighlightedBrand(null), 2000);
        }
      }, 100);
    }
  }, [loading, highlightId]);

  const fetchBrands = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching brands:', error);
      toast.error(t('brands.failedToLoad'));
    } else {
      setBrands(data || []);
      setFilteredBrands(data || []);
    }
    setLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_favorite_brands')
      .select('brand_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching favorites:', error);
    } else {
      setFavoriteBrands(new Set(data?.map(f => f.brand_id) || []));
    }
  };

  // Filter and sort brands
  useEffect(() => {
    let filtered = brands;

    // Filter by favorites first if enabled
    if (showFavoritesOnly) {
      filtered = filtered.filter(brand => favoriteBrands.has(brand.id));
    }

    if (searchQuery) {
      filtered = filtered.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.country?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter(brand => brand.country === selectedCountry);
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter(brand => brand.category === selectedCategory);
    }
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "country":
          return (a.country || "").localeCompare(b.country || "");
        default:
          return 0;
      }
    });

    setFilteredBrands(sorted);
  }, [searchQuery, selectedCountry, selectedCategory, sortBy, brands, showFavoritesOnly, favoriteBrands]);

  // Get unique countries from brands
  const countries = Array.from(new Set(brands.map(brand => brand.country).filter(Boolean))).sort();

  const toggleFavorite = async (brandId: string) => {
    if (!user) {
      haptic.warning();
      toast.error('Please sign in to favorite brands');
      navigate('/auth');
      return;
    }

    const isFavorite = favoriteBrands.has(brandId);

    if (isFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorite_brands')
        .delete()
        .eq('user_id', user.id)
        .eq('brand_id', brandId);

      if (error) {
        console.error('Error removing favorite:', error);
        haptic.error();
        toast.error(t('brands.failedToRemove'));
      } else {
        setFavoriteBrands(prev => {
          const newSet = new Set(prev);
          newSet.delete(brandId);
          return newSet;
        });
        haptic.light();
        toast.success(t('brands.removedFromFavorites'));
      }
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('user_favorite_brands')
        .insert({
          user_id: user.id,
          brand_id: brandId,
        });

      if (error) {
        console.error('Error adding favorite:', error);
        haptic.error();
        toast.error(t('brands.failedToAdd'));
      } else {
        setFavoriteBrands(prev => new Set(prev).add(brandId));
        haptic.success();
        toast.success(t('brands.addedToFavorites'));
      }
    }
  };

  if (loading) {
  return (
    <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
          <div className="container mx-auto px-3 py-2 flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-base font-bold uppercase tracking-wider">{t('nav.globalIndex')}</h1>
          </div>
        </header>
        <main className="container mx-auto px-3 py-4">
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[220px] rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in">
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:scale-110 active:scale-95 transition-transform">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold uppercase tracking-wider">{t('nav.globalIndex')}</h1>
        </div>
      </header>
      
      {/* Sticky Filter Section */}
      <div className="sticky top-[49px] z-40 bg-background/95 backdrop-blur-sm border-b border-border/30 pb-2 pt-2 px-3">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          {/* Search bar always visible */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('brands.searchBrands')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 flex-shrink-0">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
                <span className="sr-only">Toggle filters</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-hide">
            {["all", "streetwear", "sneakers", "contemporary", "designer", "luxury", "techwear", "outdoor", "heritage", "skate", "accessories", "vintage", "sportswear"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#AD3A49] text-white'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {t(`categories.${cat}`)}
              </button>
            ))}
          </div>
          <CollapsibleContent>
            <div className="space-y-3 pt-3">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('categories.all')}</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country!}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Favorites Toggle */}
              {user && (
                <Button
                  variant={showFavoritesOnly ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  {showFavoritesOnly ? t('brands.showingFavorites') : t('brands.showFavoritesOnly')}
                </Button>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t('brands.brandsFound', { count: filteredBrands.length })}
                  </p>
                  {(searchQuery || selectedCountry !== "all" || selectedCategory !== "all" || sortBy !== "name-asc" || showFavoritesOnly) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCountry("all");
                        setSelectedCategory("all");
                        setSortBy("name-asc");
                        setShowFavoritesOnly(false);
                      }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      {t('brands.clear')}
                    </Button>
                  )}
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">{t('brands.sortNameAsc')}</SelectItem>
                    <SelectItem value="name-desc">{t('brands.sortNameDesc')}</SelectItem>
                    <SelectItem value="country">{t('common.country')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <main className="container mx-auto px-3 py-4">
        {/* Brands Grid */}
        {filteredBrands.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">{t('brands.noBrands')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('brands.adjustSearch')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {filteredBrands.map((brand, index) => (
              <div
                key={brand.id}
                data-brand-id={brand.id}
                className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-muted/30 to-card hover:from-muted/50 hover:to-card/80 active:scale-[0.99] transition-all duration-200 cursor-pointer animate-scale-in ${
                  highlightedBrand === brand.id ? 'ring-2 ring-[#AD3A49] ring-offset-1 ring-offset-background' : ''
                }`}
                style={{ animationDelay: `${Math.min(index * 30, 200)}ms`, animationFillMode: 'backwards' }}
                onClick={() => navigate(`/brand/${brand.slug}`)}
              >
                {/* Logo */}
                <div className="w-14 h-14 rounded-xl bg-card border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">{brand.name.charAt(0)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {brand.country && (
                      <span className="text-sm" title={brand.country}>{getCountryFlag(brand.country)}</span>
                    )}
                    <h3 className="text-sm font-bold uppercase tracking-wide truncate">{brand.name}</h3>
                  </div>
                  {brand.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{brand.description}</p>
                  )}
                  {/* Action links */}
                  <div className="flex items-center gap-3 mt-1.5">
                    {brand.official_website && (
                      <button
                        className="text-[10px] text-[#C4956A] hover:text-[#C4956A]/80 flex items-center gap-0.5"
                        onClick={(e) => { e.stopPropagation(); window.open(brand.official_website!, '_blank'); }}
                      >
                        <ExternalLink className="w-3 h-3" /> {t('brands.web')}
                      </button>
                    )}
                    {brand.instagram_url && (
                      <button
                        className="text-[10px] text-[#C4956A] hover:text-[#C4956A]/80 flex items-center gap-0.5"
                        onClick={(e) => { e.stopPropagation(); window.open(brand.instagram_url!, '_blank'); }}
                      >
                        <Instagram className="w-3 h-3" /> {t('brands.insta')}
                      </button>
                    )}
                    <button
                      className="text-[10px] text-[#C4956A] hover:text-[#C4956A]/80 flex items-center gap-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBrandForShops({ id: brand.id, name: brand.name });
                        setShopModalOpen(true);
                      }}
                    >
                      <Store className="w-3 h-3" /> {t('brands.shops')}
                    </button>
                  </div>
                </div>

                {/* Favorite */}
                <button
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(brand.id); }}
                >
                  <Heart className={`w-4 h-4 ${favoriteBrands.has(brand.id) ? 'fill-[#AD3A49] text-[#AD3A49]' : 'text-muted-foreground'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Shop List Modal */}
      {selectedBrandForShops && (
        <ShopListModal
          brandId={selectedBrandForShops.id}
          brandName={selectedBrandForShops.name}
          isOpen={shopModalOpen}
          onClose={() => {
            setShopModalOpen(false);
            setSelectedBrandForShops(null);
          }}
        />
      )}
    </div>
  );
};

export default GlobalIndex;
