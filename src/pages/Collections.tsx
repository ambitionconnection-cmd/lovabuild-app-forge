import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Layers, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { getCountryFlag } from '@/lib/countryFlags';
import { usePageTracking } from '@/hooks/usePageTracking';

interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand_ids: string[];
  cover_image_url: string | null;
}

const Collections = () => {
  usePageTracking('collections');
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [brandsMap, setBrandsMap] = useState<Record<string, Tables<'brands'>>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch collections
      const { data: colData } = await (supabase.from('collections') as any)
        .select('id, title, slug, description, brand_ids, cover_image_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const cols = (colData || []) as Collection[];
      setCollections(cols);

      // Gather all unique brand IDs
      const allBrandIds = [...new Set(cols.flatMap(c => c.brand_ids))];
      if (allBrandIds.length > 0) {
        const { data: brandsData } = await supabase
          .from('brands')
          .select('*')
          .in('id', allBrandIds)
          .eq('is_active', true);

        const map: Record<string, Tables<'brands'>> = {};
        (brandsData || []).forEach(b => { map[b.id] = b; });
        setBrandsMap(map);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-0 lg:pt-14">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-3 py-2 flex items-center gap-3">
            <Link to="/global-index">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-base font-bold uppercase tracking-wider">Collections</h1>
          </div>
        </header>
        <main className="container mx-auto px-3 py-4 space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-0 lg:pt-14">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/global-index">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider">Collections</h1>
            <p className="text-[10px] text-muted-foreground">Curated brand selections</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 space-y-3">
        {collections.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No collections yet</p>
          </div>
        ) : (
          collections.map(col => {
            const brands = col.brand_ids.map(id => brandsMap[id]).filter(Boolean);
            const isExpanded = expandedId === col.id;

            return (
              <Card key={col.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : col.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#C4956A]/10 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 text-[#C4956A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold truncate">{col.title}</h2>
                        <Badge variant="secondary" className="text-[10px]">{brands.length}</Badge>
                      </div>
                      {col.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{col.description}</p>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Brand grid (expanded) */}
                  {isExpanded && brands.length > 0 && (
                    <div className="px-3 pb-3 border-t border-border/30">
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-3">
                        {brands.map(brand => (
                          <div
                            key={brand.id}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => navigate(`/brand/${brand.slug}`)}
                          >
                            <div className="w-12 h-12 rounded-lg bg-logo-bg border border-border/50 flex items-center justify-center overflow-hidden">
                              {brand.logo_url ? (
                                <img src={brand.logo_url} alt={brand.name} className="max-w-full max-h-full object-contain p-1" />
                              ) : (
                                <span className="text-sm font-bold text-muted-foreground">{brand.name.charAt(0)}</span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-center line-clamp-1 w-full">{brand.name}</p>
                            {brand.country && (
                              <span className="text-xs">{getCountryFlag(brand.country)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
};

export default Collections;
