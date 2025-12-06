import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Search, ExternalLink, Instagram, Store, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
import haptic from "@/lib/haptics";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const GlobalIndex = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Tables<'brands'>[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Tables<'brands'>[]>([]);
  const [favoriteBrands, setFavoriteBrands] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [selectedBrandForShops, setSelectedBrandForShops] = useState<{ id: string; name: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch brands and user favorites
  useEffect(() => {
    fetchBrands();
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchBrands = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching brands:', error);
      toast.error('Failed to load brands');
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
  }, [searchQuery, selectedCountry, sortBy, brands]);

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
        toast.error('Failed to remove favorite');
      } else {
        setFavoriteBrands(prev => {
          const newSet = new Set(prev);
          newSet.delete(brandId);
          return newSet;
        });
        haptic.light();
        toast.success('Removed from favorites');
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
        toast.error('Failed to add favorite');
      } else {
        setFavoriteBrands(prev => new Set(prev).add(brandId));
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
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-base font-bold uppercase tracking-wider">GLOBAL INDEX</h1>
          </div>
        </header>
        <main className="container mx-auto px-3 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[220px] rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold uppercase tracking-wider">GLOBAL INDEX</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-3 py-4">
        {/* Search and Filter */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Card className="mb-4 glass-card border">
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="uppercase tracking-wide text-sm">Browse Brands</CardTitle>
                  <CardDescription className="text-xs">{filteredBrands.length} brands</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
                    <span className="sr-only">Toggle filters</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search brands..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country!}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''} found
                  </p>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="country">Country</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Brands Grid */}
        {filteredBrands.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No brands found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredBrands.map((brand) => (
              <Card key={brand.id} className="overflow-hidden hover:scale-[1.02] transition-transform bg-gradient-to-br from-muted/50 via-card to-muted/30">
                {/* Favorite Button - Positioned top right */}
                <div className="relative">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full h-8 w-8 z-10 bg-muted/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(brand.id);
                    }}
                  >
                    <Heart 
                      className={`w-4 h-4 ${
                        favoriteBrands.has(brand.id) 
                          ? 'fill-primary text-primary' 
                          : ''
                      }`}
                    />
                  </Button>
                </div>

                {/* Brand Logo - Much bigger and centered */}
                <div className="pt-3 pb-2 flex justify-center">
                  <div className="w-28 h-28 rounded-2xl bg-card border border-border/50 flex items-center justify-center overflow-hidden shadow-lg">
                    {brand.logo_url ? (
                      <img 
                        src={brand.logo_url} 
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-muted-foreground">
                        {brand.name.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="pt-0 space-y-2 px-2 pb-2">
                  {/* Brand Name with Country Flag */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {brand.country && (
                        <span className="text-sm" title={brand.country}>
                          {getCountryFlag(brand.country)}
                        </span>
                      )}
                      <h3 className="text-xs font-bold uppercase tracking-wide line-clamp-1">{brand.name}</h3>
                    </div>
                  </div>

                  {/* Links - 4 buttons in 2 rows */}
                  <div className="space-y-1.5">
                    {/* Top row: Web and Insta */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {brand.official_website ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs px-2 font-medium"
                          onClick={() => window.open(brand.official_website!, '_blank')}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Web
                        </Button>
                      ) : (
                        <div className="h-8" />
                      )}
                      {brand.instagram_url ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs px-2 font-medium"
                          onClick={() => window.open(brand.instagram_url!, '_blank')}
                        >
                          <Instagram className="w-3.5 h-3.5 mr-1" />
                          Insta
                        </Button>
                      ) : (
                        <div className="h-8" />
                      )}
                    </div>
                    
                    {/* Bottom row: Shops and TikTok */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs px-2 font-medium"
                        onClick={() => {
                          setSelectedBrandForShops({ id: brand.id, name: brand.name });
                          setShopModalOpen(true);
                        }}
                      >
                        <Store className="w-3.5 h-3.5 mr-1" />
                        Shops
                      </Button>
                      {brand.tiktok_url ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs px-2 font-medium"
                          onClick={() => window.open(brand.tiktok_url!, '_blank')}
                        >
                          <TikTokIcon className="w-3.5 h-3.5 mr-1" />
                          TikTok
                        </Button>
                      ) : (
                        <div className="h-8" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
