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
import haptic from "@/lib/haptics";

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
      haptic.error();
      toast.error('Failed to remove favorite');
    } else {
      haptic.light();
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
      haptic.error();
      toast.error('Failed to remove favorite');
    } else {
      haptic.light();
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
      haptic.error();
      toast.error('Failed to remove reminder');
    } else {
      haptic.light();
      setDropReminders(prev => prev.filter(r => r.reminderId !== reminderId));
      toast.success('Reminder removed');
      fetchUserData(); // Refresh recommendations
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-0 lg:pt-14">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-3 py-2 flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-base font-bold">MY HEARDROP</h1>
          </div>
        </header>
        
        <main className="container mx-auto px-3 py-8">
          <Card className="max-w-sm mx-auto">
            <CardContent className="py-8 text-center">
              <Heart className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <h2 className="text-lg font-bold mb-1">Sign In Required</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Sign in to view your favorites and recommendations
              </p>
              <Button size="sm" onClick={() => navigate('/auth')}>
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
      <div className="min-h-screen bg-background pb-20 pt-0 lg:pt-14">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-3 py-2 flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-base font-bold">MY HEARDROP</h1>
          </div>
        </header>
        <main className="container mx-auto px-3 py-4">
          <Skeleton className="w-full h-[400px] rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-0 lg:pt-14">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/more">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold">MY HEARDROP</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-3 py-4">
        <Tabs defaultValue="favorites" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="favorites" className="text-xs">
              <Heart className="w-3 h-3 mr-1" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="reminders" className="text-xs">
              <Bell className="w-3 h-3 mr-1" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              For You
            </TabsTrigger>
          </TabsList>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            {/* Favorite Brands */}
            <section>
              <h2 className="text-sm font-bold mb-2">Favorite Brands</h2>
              {favoriteBrands.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">No favorite brands yet</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => navigate('/global-index')}
                      className="mt-1 text-xs"
                    >
                      Browse brands
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {favoriteBrands.map((brand) => (
                    <Card key={brand.id} className="overflow-hidden">
                      <CardContent className="p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                            {brand.logo_url ? (
                              <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold">{brand.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{brand.name}</p>
                            {brand.category && (
                              <Badge variant="outline" className="capitalize text-[10px] py-0 h-4">
                                {brand.category}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFavoriteBrand(brand.favoriteId)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Favorite Shops */}
            <section>
              <h2 className="text-sm font-bold mb-2">Favorite Shops</h2>
              {favoriteShops.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">No favorite shops yet</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => navigate('/directions')}
                      className="mt-1 text-xs"
                    >
                      Find shops
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {favoriteShops.map((shop) => (
                    <Card key={shop.id}>
                      <CardContent className="p-2">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-xs truncate">{shop.name}</h3>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {shop.city}, {shop.country}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFavoriteShop(shop.favoriteId)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-6 text-[10px]"
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
              <h2 className="text-sm font-bold mb-2">Drop Reminders</h2>
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
                      <div className="relative h-24 bg-muted">
                        {drop.image_url ? (
                          <img src={drop.image_url} alt={drop.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Zap className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7 touch-manipulation active:scale-95"
                          onClick={() => removeReminder(drop.reminderId)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <CardContent className="p-2">
                        <h3 className="font-semibold text-xs mb-1 line-clamp-1">{drop.title}</h3>
                        <div className="flex items-center text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-0.5" />
                          {format(new Date(drop.release_date), 'MMM d')}
                        </div>
                        {drop.isNotified && (
                          <Badge variant="secondary" className="text-[10px] mt-1 py-0">
                            <Bell className="w-2.5 h-2.5 mr-0.5" />
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
          <TabsContent value="recommendations" className="space-y-4">
            {/* Recommended Brands */}
            <section>
              <h2 className="text-sm font-bold mb-2">Recommended Brands</h2>
              {recommendedBrands.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Start favoriting brands to get personalized recommendations
                    </p>
                    <Button 
                      variant="link"
                      size="sm"
                      onClick={() => navigate('/global-index')}
                      className="mt-1 text-xs"
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
