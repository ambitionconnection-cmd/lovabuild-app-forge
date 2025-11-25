import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Search, ExternalLink, Instagram, Globe as GlobeIcon, Video, Store, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ShopListModal from "@/components/ShopListModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getCountryFlag } from "@/lib/countryFlags";

const GlobalIndex = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Tables<'brands'>[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Tables<'brands'>[]>([]);
  const [favoriteBrands, setFavoriteBrands] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

    if (selectedCategory !== "all") {
      filtered = filtered.filter(brand => brand.category === selectedCategory);
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
  }, [searchQuery, selectedCategory, selectedCountry, sortBy, brands]);

  // Get unique countries from brands
  const countries = Array.from(new Set(brands.map(brand => brand.country).filter(Boolean))).sort();

  const toggleFavorite = async (brandId: string) => {
    if (!user) {
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
        toast.error('Failed to remove favorite');
      } else {
        setFavoriteBrands(prev => {
          const newSet = new Set(prev);
          newSet.delete(brandId);
          return newSet;
        });
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
        toast.error('Failed to add favorite');
      } else {
        setFavoriteBrands(prev => new Set(prev).add(brandId));
        toast.success('Added to favorites');
      }
    }
  };

  if (loading) {
  return (
    <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold uppercase tracking-wider">GLOBAL INDEX</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[400px] rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-wider">GLOBAL INDEX</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Card className="mb-8 glass-card border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="uppercase tracking-wide">Browse Brands</CardTitle>
                  <CardDescription>Discover streetwear and sneaker brands</CardDescription>
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

                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="streetwear">Streetwear</SelectItem>
                      <SelectItem value="sneakers">Sneakers</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                      <SelectItem value="vintage">Vintage</SelectItem>
                      <SelectItem value="sportswear">Sportswear</SelectItem>
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
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground text-lg">No brands found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <Card key={brand.id} className="overflow-hidden hover:scale-[1.02] transition-transform">
                {/* Brand Banner */}
                <div className="relative h-20 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20">
                  {brand.banner_url ? (
                    <img 
                      src={brand.banner_url} 
                      alt={`${brand.name} banner`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GlobeIcon className="h-8 w-8 text-muted-foreground opacity-30" />
                    </div>
                  )}
                  
                  {/* Favorite Button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-1.5 right-1.5 rounded-full h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(brand.id);
                    }}
                  >
                    <Heart 
                      className={`w-3.5 h-3.5 ${
                        favoriteBrands.has(brand.id) 
                          ? 'fill-primary text-primary' 
                          : ''
                      }`}
                    />
                  </Button>
                </div>

                {/* Brand Logo */}
                <div className="px-4 -mt-8 mb-2 flex justify-center">
                  <div className="w-16 h-16 rounded-lg bg-card border-2 border-background flex items-center justify-center overflow-hidden shadow-lg">
                    {brand.logo_url ? (
                      <img 
                        src={brand.logo_url} 
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">
                        {brand.name.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="pt-0 space-y-2.5 px-4 pb-3">
                  {/* Brand Name & Category */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      {brand.country && (
                        <span className="text-lg" title={brand.country}>
                          {getCountryFlag(brand.country)}
                        </span>
                      )}
                      <h3 className="text-base font-bold uppercase tracking-wide">{brand.name}</h3>
                    </div>
                    {brand.category && (
                      <Badge variant="outline" className="capitalize text-xs py-0">
                        {brand.category}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {brand.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {brand.description}
                    </p>
                  )}

                  {/* Links - Row 1 */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {brand.official_website && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(brand.official_website!, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Website
                      </Button>
                    )}
                    {brand.instagram_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(brand.instagram_url!, '_blank')}
                      >
                        <Instagram className="w-3 h-3 mr-1" />
                        Instagram
                      </Button>
                    )}
                  </div>

                  {/* Links - Row 2 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedBrandForShops({ id: brand.id, name: brand.name });
                        setShopModalOpen(true);
                      }}
                    >
                      <Store className="w-3 h-3 mr-1" />
                      Shop(s)
                    </Button>
                    {brand.tiktok_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(brand.tiktok_url!, '_blank')}
                      >
                        <Video className="w-3 h-3 mr-1" />
                        TikTok
                      </Button>
                    )}
                  </div>

                  {/* History (expandable) */}
                  {brand.history && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-primary font-medium hover:underline">
                        Brand History
                      </summary>
                      <p className="mt-1.5 text-muted-foreground">
                        {brand.history}
                      </p>
                    </details>
                  )}
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
