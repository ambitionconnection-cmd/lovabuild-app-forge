import { ArrowLeft, Search, Filter, Calendar, Bell, BellOff, Zap, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

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
  category: string;
}

const Drops = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dropsRes, brandsRes, remindersRes] = await Promise.all([
        supabase
          .from('drops')
          .select('*')
          .order('release_date', { ascending: true }),
        supabase
          .from('brands')
          .select('id, name, category')
          .eq('is_active', true),
        user
          ? supabase
              .from('user_drop_reminders')
              .select('drop_id')
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] })
      ]);

      if (dropsRes.data) setDrops(dropsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (remindersRes.data) {
        setReminders(new Set(remindersRes.data.map(r => r.drop_id)));
      }
    } catch (error) {
      console.error('Error fetching drops:', error);
      toast.error('Failed to load drops');
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (dropId: string) => {
    if (!user) {
      toast.error('Please sign in to set reminders');
      return;
    }

    try {
      if (reminders.has(dropId)) {
        // Remove reminder
        const { error } = await supabase
          .from('user_drop_reminders')
          .delete()
          .eq('drop_id', dropId)
          .eq('user_id', user.id);

        if (error) throw error;

        setReminders(prev => {
          const newSet = new Set(prev);
          newSet.delete(dropId);
          return newSet;
        });
        toast.success('Reminder removed');
      } else {
        // Add reminder
        const { error } = await supabase
          .from('user_drop_reminders')
          .insert({
            drop_id: dropId,
            user_id: user.id
          });

        if (error) throw error;

        setReminders(prev => new Set(prev).add(dropId));
        toast.success('Reminder set! You\'ll be notified before the drop');
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error('Failed to update reminder');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'live': return 'destructive';
      case 'ended': return 'secondary';
      default: return 'outline';
    }
  };

  const filteredDrops = drops.filter(drop => {
    const matchesSearch = drop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         drop.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || drop.status === statusFilter;
    const matchesBrand = brandFilter === 'all' || drop.brand_id === brandFilter;
    
    let matchesCategory = true;
    if (categoryFilter !== 'all') {
      const brand = brands.find(b => b.id === drop.brand_id);
      matchesCategory = brand?.category === categoryFilter;
    }

    return matchesSearch && matchesStatus && matchesBrand && matchesCategory;
  });

  const categories = Array.from(new Set(brands.map(b => b.category).filter(Boolean)));

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setBrandFilter("all");
    setCategoryFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || brandFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Drops</h1>
            <Badge variant="outline" className="ml-auto">
              {filteredDrops.length} {filteredDrops.length === 1 ? 'Drop' : 'Drops'}
            </Badge>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filters Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Drops</SheetTitle>
                  <SheetDescription>
                    Refine your search with filters
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Brand</label>
                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            <span className="capitalize">{category}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-64 bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDrops.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {hasActiveFilters ? 'No drops match your filters' : 'No drops available'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your search or filters' 
                  : 'Check back soon for new releases'}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters}>Clear Filters</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrops.map((drop) => {
              const brand = brands.find(b => b.id === drop.brand_id);
              const hasReminder = reminders.has(drop.id);

              return (
                <Card key={drop.id} className="overflow-hidden hover:shadow-lg transition-all group">
                  <div className="relative h-64 bg-muted overflow-hidden">
                    {drop.image_url ? (
                      <img 
                        src={drop.image_url} 
                        alt={drop.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Zap className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={getStatusColor(drop.status)} className="capitalize">
                          {drop.status}
                        </Badge>
                        {drop.is_featured && <Badge variant="secondary">Featured</Badge>}
                        {drop.is_pro_exclusive && <Badge variant="outline">Pro</Badge>}
                      </div>
                      <Button
                        size="icon"
                        variant={hasReminder ? "default" : "secondary"}
                        className="h-8 w-8 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReminder(drop.id);
                        }}
                      >
                        {hasReminder ? (
                          <BellOff className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1">{drop.title}</h3>
                      {brand && (
                        <p className="text-sm text-muted-foreground">{brand.name}</p>
                      )}
                    </div>

                    {drop.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {drop.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm border-t pt-3">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(drop.release_date), 'MMM d, yyyy')}
                      </div>
                      {drop.discount_code && (
                        <Badge variant="outline" className="text-xs">
                          {drop.discount_code}
                        </Badge>
                      )}
                    </div>

                    {drop.affiliate_link && (
                      <Button 
                        className="w-full mt-3" 
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(drop.affiliate_link, '_blank')}
                      >
                        View Drop
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Drops;
