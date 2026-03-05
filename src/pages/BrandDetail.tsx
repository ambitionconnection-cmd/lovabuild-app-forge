import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ExternalLink, Instagram, Store, MapPin, ShoppingBag, Flag, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { ProUpgradeModal } from "@/components/ProUpgradeModal";
import { toast } from "sonner";
import { getCountryFlag } from "@/lib/countryFlags";
import haptic from "@/lib/haptics";
import { useLocation } from "react-router-dom";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { useTranslation } from "react-i18next";
import urbanBg from "@/assets/urban-bg.jpg";

const BrandDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = (location.state as any)?.from || null;
  
  const [brand, setBrand] = useState<Tables<'brands'> | null>(null);
  const [shops, setShops] = useState<Tables<'shops'>[]>([]);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestEditOpen, setSuggestEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [similarBrands, setSimilarBrands] = useState<Tables<'brands'>[]>([]);
  const [showProModal, setShowProModal] = useState(false);
  const { t, i18n } = useTranslation();
  const showTranslate = i18n.language !== 'en';

  const openTranslate = (text: string) => {
    const langMap: Record<string, string> = { fr: 'fr', ja: 'ja', ko: 'ko', th: 'th', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' };
    const tl = langMap[i18n.language] || 'en';
    window.open(`https://translate.google.com/m?sl=en&tl=${tl}&q=${encodeURIComponent(text)}`, '_blank');
  };

  useEffect(() => {
    if (slug) {
      fetchBrandData();
    }
  }, [slug, user]);

  const fetchBrandData = async () => {
    setLoading(true);
    
    // Fetch brand by slug
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (brandError || !brandData) {
      console.error('Error fetching brand:', brandError);
      toast.error('Brand not found');
      navigate('/global-index');
      return;
    }

    setBrand(brandData);

    // Fetch shops and favorite status in parallel
    const [shopsResult, favoriteResult] = await Promise.all([
      supabase
        .from('shops')
        .select('*')
        .eq('brand_id', brandData.id)
        .eq('is_active', true)
        .order('name'),
      user ? supabase
        .from('user_favorite_brands')
        .select('id')
        .eq('user_id', user.id)
        .eq('brand_id', brandData.id)
        .maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);

    if (!shopsResult.error) setShops(shopsResult.data || []);
    if (favoriteResult.data) setIsFavorite(true);

    // Fetch similar brands (same category or country, excluding current)
    if (brandData.category || brandData.country) {
      let query = supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .neq('id', brandData.id)
        .limit(6);

      if (brandData.category && brandData.country) {
        // Prefer same category, will sort by country match client-side
        query = query.eq('category', brandData.category);
      } else if (brandData.category) {
        query = query.eq('category', brandData.category);
      } else {
        query = query.eq('country', brandData.country!);
      }

      const { data: simData } = await query;
      // Sort: same country first
      const sorted = (simData || []).sort((a, b) => {
        const aMatch = a.country === brandData.country ? 1 : 0;
        const bMatch = b.country === brandData.country ? 1 : 0;
        return bMatch - aMatch;
      });
      setSimilarBrands(sorted.slice(0, 6));
    }

    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!user || !brand) {
      haptic.warning();
      toast.error('Please sign in to favorite brands');
      navigate('/auth');
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorite_brands')
        .delete()
        .eq('user_id', user.id)
        .eq('brand_id', brand.id);

      if (error) {
        haptic.error();
        toast.error('Failed to remove favorite');
      } else {
        setIsFavorite(false);
        haptic.light();
        toast.success('Removed from favorites');
      }
    } else {
      // Check limit for free users
      if (!isPro) {
        const { count } = await supabase
          .from('user_favorite_brands')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if ((count ?? 0) >= 8) {
          setShowProModal(true);
          return;
        }
      }

      const { error } = await supabase
        .from('user_favorite_brands')
        .insert({ user_id: user.id, brand_id: brand.id });

      if (error) {
        haptic.error();
        toast.error('Failed to add favorite');
      } else {
        setIsFavorite(true);
        haptic.success();
        toast.success('Added to favorites');
      }
    }
  };

  const submitSuggestEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (editForm.message.trim().length > 1000) {
      toast.error('Message must be less than 1000 characters');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('contact_submissions').insert({
      inquiry_type: 'correction',
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      subject: `Edit suggestion for ${brand?.name}`,
      message: `[Brand: ${brand?.name} | ID: ${brand?.id}]\n\n${editForm.message.trim()}`,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Failed to submit. Try again.');
    } else {
      haptic.success();
      toast.success('Thanks! We will review your suggestion.');
      setSuggestEditOpen(false);
      setEditForm({ name: '', email: '', message: '' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 lg:top-12 z-50 glass-effect border-b border-border/50">
          <div className="container mx-auto px-3 py-2 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => fromPage ? navigate(fromPage) : navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-3 py-4 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </main>
      </div>
    );
  }

  if (!brand) return null;

  return (
    <>
    <div className="min-h-screen bg-background pb-20 animate-fade-in">
      <header className="sticky top-0 lg:top-12 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:scale-110 active:scale-95 transition-transform"
              onClick={() => fromPage ? navigate(fromPage) : navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-base font-bold uppercase tracking-wider line-clamp-1 animate-fade-in">{brand.name}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFavorite}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 lg:pt-8 space-y-4">
        {/* Brand Hero Card */}
        <Card className="overflow-hidden border-[#A3A39E]/30 animate-scale-in relative">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${urbanBg})` }} />
          <div className="absolute inset-0 bg-background/80" />
          <CardContent className="p-4 lg:p-6 relative">
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-center lg:gap-12">
              {/* Logo */}
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl bg-logo-bg border-2 border-primary/30 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/10 animate-scale-in flex-shrink-0" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <span className="text-4xl font-bold text-muted-foreground">{brand.name.charAt(0)}</span>
                )}
              </div>

              {/* Name, Country, CTA, Social — stacked on right for desktop */}
              <div className="flex flex-col items-center gap-3 lg:items-start lg:flex-1">
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    {brand.country && (
                      <span className="text-xl" title={brand.country}>{getCountryFlag(brand.country)}</span>
                    )}
                    <h2 className="text-xl font-bold uppercase tracking-wide text-[#c48e19]">{brand.name}</h2>
                  </div>
                  {brand.description && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-md">{brand.description}</p>
                  )}
                </div>

                {/* Shop Online CTA */}
                {brand.affiliate_url && (
                  <Button
                    className="w-full max-w-xs bg-[#C4956A] hover:bg-[#C4956A]/80 text-white font-semibold h-11"
                    onClick={() => {
                      window.open(brand.affiliate_url!, '_blank');
                      supabase.from('affiliate_analytics' as any).insert({
                        drop_id: brand.id,
                        event_type: 'shop_online_click',
                        user_id: user?.id || null,
                      }).then(() => {});
                    }}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Shop Online
                  </Button>
                )}

                {/* Social Links */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                  {brand.official_website && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9"
                      onClick={() => window.open(brand.official_website!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      Website
                    </Button>
                  )}
                  {brand.instagram_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9"
                      onClick={() => window.open(brand.instagram_url!, '_blank')}
                    >
                      <Instagram className="w-4 h-4 mr-1.5" />
                      Instagram
                    </Button>
                  )}
                  {brand.tiktok_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9"
                      onClick={() => window.open(brand.tiktok_url!, '_blank')}
                    >
                      <TikTokIcon className="w-4 h-4 mr-1.5" />
                      TikTok
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand History */}
        {brand.history && (
        <Card className="animate-fade-in border-[#A3A39E]/30 bg-[#A3A39E]/10" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wide text-[#c48e19] font-bold">About</CardTitle>
                {showTranslate && (
                  <button onClick={() => openTranslate(brand.history!)} className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-muted transition-colors text-muted-foreground" title={t('shops.translate')}>
                    <Languages className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{t('shops.translate')}</span>
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{brand.history}</p>
            </CardContent>
          </Card>
        )}

        {/* Shops */}
        <Card className="animate-fade-in border-[#A3A39E]/30 bg-[#A3A39E]/10" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide text-[#c48e19] font-bold">Stores</CardTitle>
              <Badge variant="secondary" className="text-xs">{shops.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {shops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No stores available</p>
            ) : (
              <div className="space-y-3">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/directions?shopId=${shop.id}&lat=${shop.latitude}&lng=${shop.longitude}&zoom=16`)}
                  >
                    <div className="w-12 h-12 rounded-lg bg-card border overflow-hidden flex-shrink-0">
                      {shop.image_url ? (
                        <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{shop.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {shop.city}, {shop.country}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Similar Brands */}
        {similarBrands.length > 0 && (
          <Card className="animate-fade-in border-[#A3A39E]/30 relative overflow-hidden" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${urbanBg})` }} />
            <div className="absolute inset-0 bg-background/80" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-sm uppercase tracking-wide text-[#c48e19] font-bold">Similar To {brand.name}</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {similarBrands.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/brand/${b.slug}`)}
                  >
                    <div className="w-12 h-12 rounded-lg bg-logo-bg border border-border/50 flex items-center justify-center overflow-hidden">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{b.name.charAt(0)}</span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-center line-clamp-1 w-full">{b.name}</p>
                    {b.country && (
                      <span className="text-xs">{getCountryFlag(b.country)}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggest an Edit */}
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSuggestEditOpen(true)}
          >
            <Flag className="w-3 h-3 mr-1.5" />
            Suggest an Edit
          </Button>
        </div>
      </main>

      {/* Suggest Edit Dialog */}
      <Dialog open={suggestEditOpen} onOpenChange={setSuggestEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Suggest an Edit</DialogTitle>
            <DialogDescription className="text-xs">
              Spotted incorrect info for {brand.name}? Let us know.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="Your name"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                maxLength={100}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={editForm.email}
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                maxLength={255}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">What needs to be corrected?</Label>
              <Textarea
                placeholder="e.g. The website URL is wrong, the country should be Japan..."
                value={editForm.message}
                onChange={(e) => setEditForm(f => ({ ...f, message: e.target.value }))}
                maxLength={1000}
                className="text-sm min-h-[80px]"
              />
            </div>
            <Button
              className="w-full"
              onClick={submitSuggestEdit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    <ProUpgradeModal open={showProModal} onOpenChange={setShowProModal} trigger="favourites" />
    </>
  );
};

export default BrandDetail;
