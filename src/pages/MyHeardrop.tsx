import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Bell, TrendingUp, MapPin, ExternalLink, Instagram, Globe, Zap, Calendar, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface FavoriteBrand extends Tables<'brands'> {
  favoriteId: string;
}

interface FavoriteShop extends Tables<'shops'> {
  favoriteId: string;
}

interface DropReminder extends Tables<'drops'> {
  reminderId: string;
  isNotified: boolean;
}

const MyHeardrop = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favoriteBrands, setFavoriteBrands] = useState<FavoriteBrand[]>([]);
  const [favoriteShops, setFavoriteShops] = useState<FavoriteShop[]>([]);
  const [dropReminders, setDropReminders] = useState<DropReminder[]>([]);
  const [recommendedBrands, setRecommendedBrands] = useState<Tables<'brands'>[]>([]);
  const [recommendedDrops, setRecommendedDrops] = useState<Tables<'drops'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch favorite brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('user_favorite_brands')
        .select('id, brand_id, brands(*)')
        .eq('user_id', user.id);

      if (brandsError) throw brandsError;

      const brands = brandsData?.map(item => ({
        ...item.brands,
        favoriteId: item.id
      })) as FavoriteBrand[];

      setFavoriteBrands(brands || []);

      // Fetch favorite shops
      const { data: shopsData, error: shopsError } = await supabase
        .from('user_favorite_shops')
        .select('id, shop_id, shops(*)')
        .eq('user_id', user.id);

      if (shopsError) throw shopsError;

      const shops = shopsData?.map(item => ({
        ...item.shops,
        favoriteId: item.id
      })) as FavoriteShop[];

      setFavoriteShops(shops || []);

      // Fetch drop reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('user_drop_reminders')
        .select('id, is_notified, drop_id, drops(*)')
        .eq('user_id', user.id);

      if (remindersError) throw remindersError;

      const reminders = remindersData?.map(item => ({
        ...item.drops,
        reminderId: item.id,
        isNotified: item.is_notified
      })) as DropReminder[];

      setDropReminders(reminders || []);

      // Fetch recommendations based on favorite categories
      const favoriteCategories = brands
        .map(b => b.category)
        .filter(c => c !== null);

      if (favoriteCategories.length > 0) {
        // Recommend brands from same categories
        const { data: recBrands } = await supabase
          .from('brands')
          .select('*')
          .in('category', favoriteCategories)
          .eq('is_active', true)
          .not('id', 'in', `(${brands.map(b => b.id).join(',')})`)
          .limit(6);

        setRecommendedBrands(recBrands || []);

        // Recommend upcoming drops from same categories
        const { data: recDrops } = await supabase
          .from('drops')
          .select('*')
          .in('brand_id', brands.map(b => b.id))
          .eq('status', 'upcoming')
          .not('id', 'in', reminders.length > 0 ? `(${reminders.map(r => r.id).join(',')})` : '()')
          .order('release_date', { ascending: true })
          .limit(4);

        setRecommendedDrops(recDrops || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load your data');
    } finally {
      setLoading(false);
    }
  };

  const removeFavoriteBrand = async (favoriteId: string) => {
    const { error } = await supabase
      .from('user_favorite_brands')
      .delete()
      .eq('id', favoriteId);

    if (error) {
      toast.error('Failed to remove favorite');
    } else {
      setFavoriteBrands(prev => prev.filter(b => b.favoriteId !== favoriteId));
      toast.success('Removed from favorites');
      fetchUserData(); // Refresh recommendations
    }
  };

  const removeFavoriteShop = async (favoriteId: string) => {
    const { error } = await supabase
      .from('user_favorite_shops')
      .delete()
      .eq('id', favoriteId);

    if (error) {
      toast.error('Failed to remove favorite');
    } else {
      setFavoriteShops(prev => prev.filter(s => s.favoriteId !== favoriteId));
      toast.success('Removed from favorites');
    }
  };

  const removeReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from('user_drop_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      toast.error('Failed to remove reminder');
    } else {
      setDropReminders(prev => prev.filter(r => r.reminderId !== reminderId));
      toast.success('Reminder removed');
      fetchUserData(); // Refresh recommendations
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">MY HEARDROP</h1>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                Sign in to view your favorites, reminders, and personalized recommendations
              </p>
              <Button onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">MY HEARDROP</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="w-full h-[600px] rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">MY HEARDROP</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="favorites">
              <Heart className="w-4 h-4 mr-2" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="w-4 h-4 mr-2" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <TrendingUp className="w-4 h-4 mr-2" />
              For You
            </TabsTrigger>
          </TabsList>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6">
            {/* Favorite Brands */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Favorite Brands</h2>
              {favoriteBrands.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No favorite brands yet</p>
                    <Button 
                      variant="link" 
                      onClick={() => navigate('/global-index')}
                      className="mt-2"
                    >
                      Browse brands
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteBrands.map((brand) => (
                    <Card key={brand.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                              {brand.logo_url ? (
                                <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold">{brand.name.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{brand.name}</CardTitle>
                              {brand.category && (
                                <Badge variant="outline" className="mt-1 capitalize text-xs">
                                  {brand.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFavoriteBrand(brand.favoriteId)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {brand.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {brand.description}
                          </p>
                        )}
                        <div className="flex gap-2">
                          {brand.official_website && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(brand.official_website!, '_blank')}
                            >
                              <Globe className="w-3 h-3 mr-1" />
                              Website
                            </Button>
                          )}
                          {brand.instagram_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(brand.instagram_url!, '_blank')}
                            >
                              <Instagram className="w-3 h-3 mr-1" />
                              Instagram
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Favorite Shops */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Favorite Shops</h2>
              {favoriteShops.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No favorite shops yet</p>
                    <Button 
                      variant="link" 
                      onClick={() => navigate('/directions')}
                      className="mt-2"
                    >
                      Find shops
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteShops.map((shop) => (
                    <Card key={shop.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{shop.name}</h3>
                            {shop.category && (
                              <Badge variant="outline" className="mt-1 capitalize text-xs">
                                {shop.category}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFavoriteShop(shop.favoriteId)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{shop.address}, {shop.city}, {shop.country}</span>
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 w-full"
                          onClick={() => navigate('/directions')}
                        >
                          View on Map
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders">
            <section>
              <h2 className="text-2xl font-bold mb-4">Drop Reminders</h2>
              {dropReminders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No drop reminders set</p>
                    <Button 
                      variant="link" 
                      onClick={() => navigate('/drops')}
                      className="mt-2"
                    >
                      Browse drops
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dropReminders.map((drop) => (
                    <Card key={drop.id} className="overflow-hidden">
                      <div className="relative h-32 bg-muted">
                        {drop.image_url ? (
                          <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Zap className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeReminder(drop.reminderId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-1">{drop.title}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(drop.release_date), 'MMM d, yyyy')}
                        </div>
                        {drop.isNotified && (
                          <Badge variant="secondary" className="text-xs">
                            <Bell className="w-3 h-3 mr-1" />
                            Notified
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            {/* Recommended Brands */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Recommended Brands</h2>
              {recommendedBrands.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Start favoriting brands to get personalized recommendations
                    </p>
                    <Button 
                      variant="link" 
                      onClick={() => navigate('/global-index')}
                      className="mt-2"
                    >
                      Browse brands
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recommendedBrands.map((brand) => (
                    <Card key={brand.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/global-index')}>
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {brand.logo_url ? (
                            <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold">{brand.name.charAt(0)}</span>
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

            {/* Recommended Drops */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Upcoming Drops You Might Like</h2>
              {recommendedDrops.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No upcoming drops from your favorite brands
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recommendedDrops.map((drop) => (
                    <Card key={drop.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/drops')}>
                      <div className="relative h-32 bg-muted">
                        {drop.image_url ? (
                          <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Zap className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm mb-2 line-clamp-1">{drop.title}</h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(drop.release_date), 'MMM d, yyyy')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyHeardrop;
