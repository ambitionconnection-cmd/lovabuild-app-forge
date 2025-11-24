import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Search, ExternalLink, Instagram, Globe as GlobeIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Filter brands
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

    setFilteredBrands(filtered);
  }, [searchQuery, selectedCategory, selectedCountry, brands]);

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
        <Card className="mb-8 glass-card border-2">
          <CardHeader>
            <CardTitle className="uppercase tracking-wide">Browse Brands</CardTitle>
            <CardDescription>Discover streetwear and sneaker brands</CardDescription>
          </CardHeader>
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

            <p className="text-sm text-muted-foreground font-medium">
              {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''} found
            </p>
          </CardContent>
        </Card>

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
                <div className="relative h-32 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20">
                  {brand.banner_url ? (
                    <img 
                      src={brand.banner_url} 
                      alt={`${brand.name} banner`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GlobeIcon className="h-12 w-12 text-muted-foreground opacity-30" />
                    </div>
                  )}
                  
                  {/* Favorite Button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full"
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

                {/* Brand Logo */}
                <div className="px-6 -mt-12 mb-4 flex justify-center">
                  <div className="w-24 h-24 rounded-xl bg-card border-4 border-background flex items-center justify-center overflow-hidden shadow-lg">
                    {brand.logo_url ? (
                      <img 
                        src={brand.logo_url} 
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {brand.name.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="pt-0 space-y-4">
                  {/* Brand Name & Category */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {brand.country && (
                        <span className="text-2xl" title={brand.country}>
                          {getCountryFlag(brand.country)}
                        </span>
                      )}
                      <h3 className="text-xl font-bold uppercase tracking-wide">{brand.name}</h3>
                    </div>
                    {brand.category && (
                      <Badge variant="outline" className="capitalize">
                        {brand.category}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {brand.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {brand.description}
                    </p>
                  )}

                  {/* Links */}
                  <div className="flex gap-2 pt-2">
                    {brand.official_website && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(brand.official_website!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Website
                      </Button>
                    )}
                    {brand.instagram_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(brand.instagram_url!, '_blank')}
                      >
                        <Instagram className="w-4 h-4 mr-1" />
                        Instagram
                      </Button>
                    )}
                  </div>

                  {/* History (expandable) */}
                  {brand.history && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary font-medium hover:underline">
                        Brand History
                      </summary>
                      <p className="mt-2 text-muted-foreground">
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
    </div>
  );
};

export default GlobalIndex;
