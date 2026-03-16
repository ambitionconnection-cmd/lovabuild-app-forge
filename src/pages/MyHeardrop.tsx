import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Heart, Navigation, TrendingUp, MapPin, Trash2, Share2, FileText, Route, UserMinus, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import haptic from "@/lib/haptics";
import { useTranslation } from "react-i18next";

interface FavoriteBrand extends Tables<'brands'> {
  favoriteId: string;
}

interface FavoriteShop extends Tables<'shops'> {
  favoriteId: string;
}

interface SavedRoute {
  id: string;
  name: string;
  stops: any[];
  created_at: string;
}

interface FollowedUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  follow_id: string;
  has_new_post: boolean;
  latest_post_image?: string | null;
}

const MyHeardrop = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favoriteBrands, setFavoriteBrands] = useState<FavoriteBrand[]>([]);
  const [favoriteShops, setFavoriteShops] = useState<FavoriteShop[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [recommendedBrands, setRecommendedBrands] = useState<Tables<'brands'>[]>([]);
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

      // Fetch saved routes
      const { data: routesData } = await (supabase.from('saved_routes') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setSavedRoutes(routesData || []);

      // Fetch recommendations based on favorite categories
      const favoriteCategories = brands
        .map(b => b.category)
        .filter(c => c !== null);

      if (favoriteCategories.length > 0) {
        const { data: recBrands } = await supabase
          .from('brands')
          .select('*')
          .in('category', favoriteCategories)
          .eq('is_active', true)
          .not('id', 'in', `(${brands.map(b => b.id).join(',')})`)
          .limit(6);

        setRecommendedBrands(recBrands || []);
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
      fetchUserData();
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

  const deleteRoute = async (routeId: string) => {
    const { error } = await (supabase.from('saved_routes') as any)
      .delete()
      .eq('id', routeId);

    if (error) {
      haptic.error();
      toast.error('Failed to delete route');
    } else {
      haptic.light();
      setSavedRoutes(prev => prev.filter(r => r.id !== routeId));
      toast.success('Route deleted');
    }
  };

  const shareRoute = async (route: SavedRoute) => {
    const { shareRoute: doShare } = await import('@/lib/routeActions');
    await doShare(route.stops, null);
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
            <h1 className="text-base font-bold">MY FLYAF</h1>
          </div>
        </header>
        
        <main className="container mx-auto px-3 py-8">
          <Card className="max-w-sm mx-auto">
            <CardContent className="py-8 text-center">
              <Heart className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <h2 className="text-lg font-bold mb-1">{t('myHeardrop.signInRequired')}</h2>
              <p className="text-xs text-muted-foreground mb-4">
                {t('myHeardrop.signInToView')}
              </p>
              <Button size="sm" onClick={() => navigate('/auth')}>
                {t('auth.signIn')}
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
            <h1 className="text-base font-bold">MY FLYAF</h1>
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
          <h1 className="text-base font-bold">MY FLYAF</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-3 py-4">
        <Tabs defaultValue="favorites" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="favorites" className="text-xs">
              <Heart className="w-3 h-3 mr-1" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="routes" className="text-xs">
              <Route className="w-3 h-3 mr-1" />
              My Routes
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
                    <Card key={brand.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/brand/${brand.slug}`)}>
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
                            onClick={(e) => { e.stopPropagation(); removeFavoriteBrand(brand.favoriteId); }}
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

          {/* My Routes Tab */}
          <TabsContent value="routes">
            <section>
              <h2 className="text-sm font-bold mb-2">Saved Routes</h2>
              {savedRoutes.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center">
                    <Navigation className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">No saved routes yet</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      Build a route on the map and save it
                    </p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => navigate('/')}
                      className="mt-1 text-xs"
                    >
                      Go to Map
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {savedRoutes.map((route) => (
                    <Card key={route.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{route.name}</h3>
                            <p className="text-[10px] text-muted-foreground">
                              {route.stops?.length || 0} stop{(route.stops?.length || 0) !== 1 ? 's' : ''} · {format(new Date(route.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => shareRoute(route)}
                            >
                              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => deleteRoute(route.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {/* Stop preview */}
                        <div className="space-y-1">
                          {(route.stops || []).slice(0, 3).map((stop: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <div className="w-4 h-4 rounded-full bg-[#C4956A]/20 text-[#C4956A] flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                {i + 1}
                              </div>
                              <span className="truncate text-muted-foreground">{stop.name}</span>
                            </div>
                          ))}
                          {(route.stops?.length || 0) > 3 && (
                            <p className="text-[10px] text-muted-foreground/60 pl-6">
                              +{route.stops.length - 3} more
                            </p>
                          )}
                        </div>
                        {/* Start Route button */}
                        <Button
                          className="w-full mt-3 bg-[#C4956A] hover:bg-[#C4956A]/90 text-white font-bold uppercase tracking-wider text-xs"
                          onClick={() => {
                            // Load the saved route into the active route
                            const stopsJson = JSON.stringify(route.stops);
                            sessionStorage.setItem('flyaf_route_stops', stopsJson);
                            localStorage.setItem('flyaf_route_stops', stopsJson);
                            // Navigate to map and switch to route mode
                            navigate('/');
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('switchToRouteMode'));
                              window.dispatchEvent(new CustomEvent('reopenRouteSheet'));
                            }, 300);
                            toast.success(`Route "${route.name}" loaded — let's go!`);
                            haptic.success();
                          }}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Start This Route
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {recommendedBrands.map((brand) => (
                    <Card key={brand.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/brand/${brand.slug}`)}>
                      <CardContent className="p-3">
                        <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                          {brand.logo_url ? (
                            <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold">{brand.name.charAt(0)}</span>
                          )}
                        </div>
                        <p className="font-medium text-xs text-center line-clamp-1">{brand.name}</p>
                        {brand.category && (
                          <p className="text-[10px] text-muted-foreground text-center capitalize">{brand.category}</p>
                        )}
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
