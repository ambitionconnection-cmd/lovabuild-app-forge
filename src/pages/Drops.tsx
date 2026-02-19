import { ArrowLeft, Search, Filter, Calendar, Bell, BellOff, Zap, X, Copy, Check, ChevronDown, ExternalLink, Clock } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import haptic from "@/lib/haptics";

interface Drop {
  id: string;
  title: string;
  description: string;
  image_url: string;
  release_date: string;
  status: string;
  is_featured: boolean;
  is_pro_exclusive: boolean;
  brand_id: string;
  affiliate_link: string;
  discount_code: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

const Drops = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [drops, setDrops] = useState<Drop[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set());
  const [highlightedDrop, setHighlightedDrop] = useState<string | null>(highlightId);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && highlightId) {
      setTimeout(() => {
        const element = document.querySelector(`[data-drop-id="${highlightId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => setHighlightedDrop(null), 2000);
        }
      }, 100);
    }
  }, [loading, highlightId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dropsRes, brandsRes] = await Promise.all([
        supabase.from('drops').select('*').order('release_date', { ascending: true }),
        supabase.from('brands').select('id, name, logo_url'),
      ]);

      if (dropsRes.data) setDrops(dropsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);

      if (user) {
        const { data: reminderData } = await supabase
          .from('drop_reminders')
          .select('drop_id')
          .eq('user_id', user.id);
        if (reminderData) {
          setReminders(new Set(reminderData.map(r => r.drop_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching drops:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (dropId: string) => {
    if (!user) {
      toast.info('Sign in required', {
        description: 'Sign in to set drop reminders',
        action: {
          label: 'Sign In',
          onClick: () => navigate('/auth'),
        },
      });
      return;
    }

    haptic.light();
    const hasReminder = reminders.has(dropId);

    if (hasReminder) {
      await supabase.from('drop_reminders').delete().eq('drop_id', dropId).eq('user_id', user.id);
      setReminders(prev => {
        const next = new Set(prev);
        next.delete(dropId);
        return next;
      });
      toast.success('Reminder removed');
    } else {
      await supabase.from('drop_reminders').insert({ drop_id: dropId, user_id: user.id });
      setReminders(prev => new Set(prev).add(dropId));
      toast.success('Reminder set!');
    }
  };

  const handleDiscountCodeCopy = (drop: Drop) => {
    haptic.light();
    navigator.clipboard.writeText(drop.discount_code);
    setCopiedCodes(prev => new Set(prev).add(drop.id));
    toast.success(`Code "${drop.discount_code}" copied!`);
    setTimeout(() => {
      setCopiedCodes(prev => {
        const next = new Set(prev);
        next.delete(drop.id);
        return next;
      });
    }, 2000);
  };

  const handleAffiliateClick = (drop: Drop) => {
    haptic.light();
    window.open(drop.affiliate_link, '_blank');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'upcoming': return 'bg-[#C4956A]/20 text-[#C4956A] border-[#C4956A]/30';
      case 'ended': return 'bg-white/10 text-white/40 border-white/10';
      default: return 'bg-white/10 text-white/40 border-white/10';
    }
  };

  const getTimeLabel = (releaseDate: string) => {
    try {
      const date = new Date(releaseDate);
      if (isPast(date)) return 'Released';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  // Auto-calculate status from release date
  const dropsWithAutoStatus = drops.map((drop) => {
    const releaseDate = new Date(drop.release_date);
    const now = new Date();
    const oneDayAfter = new Date(releaseDate);
    oneDayAfter.setDate(oneDayAfter.getDate() + 1);
    
    let autoStatus = drop.status;
    if (isFuture(releaseDate)) {
      autoStatus = 'upcoming';
    } else if (isPast(oneDayAfter)) {
      autoStatus = 'ended';
    } else {
      autoStatus = 'live';
    }
    return { ...drop, status: autoStatus };
  });

  const filteredDrops = dropsWithAutoStatus.filter((drop) => {
    const matchesSearch = drop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         drop.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || drop.status === statusFilter;
    const matchesBrand = brandFilter === 'all' || drop.brand_id === brandFilter;
    return matchesSearch && matchesStatus && matchesBrand;
  });

  const hasActiveFilters = searchQuery || statusFilter !== "all" || brandFilter !== "all";

  // Sort: live first, then upcoming, then ended
  const sortedDrops = [...filteredDrops].sort((a, b) => {
    const order = { live: 0, upcoming: 1, ended: 2 };
    const aOrder = order[a.status as keyof typeof order] ?? 3;
    const bOrder = order[b.status as keyof typeof order] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
  });

  return (
    <div className="min-h-screen bg-background pb-20 pt-0 lg:pt-14 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 lg:top-14 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:scale-110 active:scale-95 transition-transform">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold uppercase tracking-wider">DROPS</h1>
          <Badge variant="outline" className="ml-auto text-xs border-[#C4956A]/30 text-[#C4956A]">
            {filteredDrops.length} {filteredDrops.length === 1 ? 'Drop' : 'Drops'}
          </Badge>
        </div>
      </header>

      {/* Sticky Search & Filters */}
      <div className="sticky top-[49px] lg:top-[105px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/30 pb-2 pt-2 px-3">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search drops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 flex-shrink-0">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="space-y-3 pt-3">
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live Now</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setBrandFilter("all"); }}>
                  <X className="w-3 h-3 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedDrops.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="text-base font-semibold mb-1 text-white/70">
              {hasActiveFilters ? 'No drops match your filters' : 'No drops yet'}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {hasActiveFilters ? 'Try adjusting your search or filters' : 'Community drops coming soon'}
            </p>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setBrandFilter("all"); }}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {sortedDrops.map((drop) => {
              const brand = brands.find(b => b.id === drop.brand_id);
              const hasReminder = reminders.has(drop.id);
              const timeLabel = getTimeLabel(drop.release_date);
              const isLive = drop.status === 'live';
              const isEnded = drop.status === 'ended';

              return (
                <div
                  key={drop.id}
                  data-drop-id={drop.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer animate-scale-in ${
                    isEnded 
                      ? 'bg-muted/20 opacity-60' 
                      : isLive 
                        ? 'bg-gradient-to-r from-green-500/10 to-card hover:from-green-500/20' 
                        : 'bg-gradient-to-r from-muted/30 to-card hover:from-muted/50'
                  } ${highlightedDrop === drop.id ? 'ring-2 ring-[#AD3A49] ring-offset-1 ring-offset-background' : ''}`}
                  onClick={() => {
                    if (drop.affiliate_link) {
                      handleAffiliateClick(drop);
                    }
                  }}
                >
                  {/* Drop Image */}
                  <div className="w-16 h-16 rounded-xl bg-card border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {drop.image_url ? (
                      <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : brand?.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-10 h-10 object-contain" loading="lazy" />
                    ) : (
                      <Zap className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase ${getStatusStyle(drop.status)}`}>
                        {isLive ? '● Live' : drop.status}
                      </span>
                      {drop.is_featured && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#AD3A49]/20 text-[#AD3A49] border border-[#AD3A49]/30">Featured</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold truncate">{drop.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {brand && <span className="text-xs text-muted-foreground">{brand.name}</span>}
                      <span className="text-[10px] text-muted-foreground/60">•</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {format(new Date(drop.release_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {/* Action links */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {timeLabel && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${isLive ? 'text-green-400' : isEnded ? 'text-white/30' : 'text-[#C4956A]'}`}>
                          <Clock className="w-3 h-3" /> {timeLabel}
                        </span>
                      )}
                      {drop.discount_code && (
                        <button
                          className="text-[10px] text-[#C4956A] hover:text-[#C4956A]/80 flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); handleDiscountCodeCopy(drop); }}
                        >
                          {copiedCodes.has(drop.id) ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          Code
                        </button>
                      )}
                      {drop.affiliate_link && (
                        <button
                          className="text-[10px] text-[#C4956A] hover:text-[#C4956A]/80 flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); handleAffiliateClick(drop); }}
                        >
                          <ExternalLink className="w-3 h-3" /> Shop
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reminder Bell */}
                  <button
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      hasReminder ? 'bg-[#AD3A49]/20 text-[#AD3A49]' : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                    onClick={(e) => { e.stopPropagation(); toggleReminder(drop.id); }}
                  >
                    {hasReminder ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Drops;