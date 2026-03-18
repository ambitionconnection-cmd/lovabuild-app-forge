import { useState, useEffect, useRef, useCallback } from "react";
import { normalizeSearch } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, Search, Trash2, Copy, Image as ImageIcon, Loader2, FileUp, Store, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Brand = Tables<"brands">;
type Shop = Tables<"shops">;

export const MediaManagement = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"logo" | "banner" | "shop" | "shop-logo">("logo");
  const [newUrl, setNewUrl] = useState("");
  const [deletingImage, setDeletingImage] = useState<{ brand?: Brand; shop?: Shop; type: "logo" | "banner" | "shop" | "shop-logo" } | null>(null);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [mediaTab, setMediaTab] = useState<"brands" | "shops">("brands");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shopGridRef = useRef<HTMLDivElement>(null);
  const brandGridRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<number>(0);
  const activeGridRef = useRef<'brands' | 'shops'>('brands');

  const saveScrollPosition = useCallback(() => {
    const ref = activeGridRef.current === 'shops' ? shopGridRef : brandGridRef;
    savedScrollRef.current = ref.current?.scrollTop || 0;
  }, []);

  const restoreScrollPosition = useCallback(() => {
    requestAnimationFrame(() => {
      const ref = activeGridRef.current === 'shops' ? shopGridRef : brandGridRef;
      if (ref.current) {
        ref.current.scrollTop = savedScrollRef.current;
      }
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [brandsResult, shopsResult] = await Promise.all([
        supabase.from("brands").select("*").order("name"),
        supabase.from("shops").select("*").order("name"),
      ]);
      if (brandsResult.error) throw brandsResult.error;
      if (shopsResult.error) throw shopsResult.error;
      setBrands(brandsResult.data || []);
      setShops(shopsResult.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Normalize country names for consistent grouping
  const normalizeCountry = (country: string): string => {
    const map: Record<string, string> = {
      "UK": "United Kingdom",
      "uk": "United Kingdom",
      "U.K.": "United Kingdom",
      "USA": "United States",
      "US": "United States",
      "U.S.A.": "United States",
    };
    return map[country] || country;
  };

  // Derive unique country lists for dropdowns (normalized)
  const brandCountries = [...new Set(brands.map(b => b.country ? normalizeCountry(b.country) : null).filter(Boolean) as string[])].sort();
  const shopCountries = [...new Set(shops.map(s => s.country ? normalizeCountry(s.country) : null).filter(Boolean) as string[])].sort();
  const brandCategories = [...new Set(brands.map(b => b.category).filter(Boolean) as string[])].sort();

  const filteredBrands = brands.filter((brand) => {
    const q = normalizeSearch(searchQuery);
    const matchesSearch = !q || 
      normalizeSearch(brand.name).includes(q) ||
      normalizeSearch(brand.country || '').includes(q) ||
      normalizeSearch(brand.category || '').includes(q) ||
      normalizeSearch(brand.description || '').includes(q);
    const normalizedBrandCountry = brand.country ? normalizeCountry(brand.country) : null;
    const matchesCountry = countryFilter === "all" || normalizedBrandCountry === countryFilter;
    const matchesCategory = categoryFilter === "all" || brand.category === categoryFilter;
    return matchesSearch && matchesCountry && matchesCategory;
  });

  const filteredShops = shops.filter((shop) => {
    const q = normalizeSearch(searchQuery);
    const matchesSearch = !q ||
      normalizeSearch(shop.name).includes(q) ||
      normalizeSearch(shop.city).includes(q) ||
      normalizeSearch(shop.country).includes(q) ||
      normalizeSearch(shop.address || '').includes(q) ||
      normalizeSearch(shop.description || '').includes(q);
    const normalizedShopCountry = shop.country ? normalizeCountry(shop.country) : null;
    const matchesCountry = countryFilter === "all" || normalizedShopCountry === countryFilter;
    const matchesCategory = categoryFilter === "all" || shop.category === categoryFilter;
    return matchesSearch && matchesCountry && matchesCategory;
  });

  const handleFileUpload = async (file: File) => {
    if (!selectedBrand && !selectedShop) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const allowedTypes = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
      
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        throw new Error('Please upload a valid image file (JPG, PNG, WebP, or SVG)');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const slug = selectedBrand?.slug || selectedShop?.slug || 'item';
      const folder = uploadType === "shop" ? "shops" : `${uploadType}s`;
      const fileName = `${slug}-${uploadType}-${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-images')
        .getPublicUrl(filePath);

      if (selectedBrand) {
        await handleBrandUrlUpdate(selectedBrand, uploadType as "logo" | "banner", publicUrl);
      } else if (selectedShop) {
        await handleShopUrlUpdate(selectedShop, publicUrl, uploadType === "shop-logo" ? "logo" : "image");
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else {
      toast.error('Please drop a valid image file');
    }
  };

  const handleBrandUrlUpdate = async (brand: Brand, type: "logo" | "banner", url: string) => {
    try {
      const updateData = type === "logo" ? { logo_url: url || null } : { banner_url: url || null };
      
      const { error } = await supabase
        .from("brands")
        .update(updateData)
        .eq("id", brand.id);

      if (error) throw error;

      toast.success(`${type === "logo" ? "Logo" : "Banner"} updated for ${brand.name}`);
      // Update local state to preserve scroll position
      setBrands(prev => prev.map(b => 
        b.id === brand.id ? { ...b, ...updateData } : b
      ));
      setSelectedBrand(null);
      setNewUrl("");
      restoreScrollPosition();
    } catch (error: any) {
      console.error("Error updating image:", error);
      toast.error(error.message || "Failed to update image");
    }
  };

  const handleShopUrlUpdate = async (shop: Shop, url: string, field: "image" | "logo" = "image") => {
    try {
      const updateData = field === "logo" ? { logo_url: url || null } : { image_url: url || null };
      const { error } = await supabase
        .from("shops")
        .update(updateData)
        .eq("id", shop.id);

      if (error) throw error;

      toast.success(`${field === "logo" ? "Logo" : "Image"} updated for ${shop.name}`);
      // Update local state to preserve scroll position
      setShops(prev => prev.map(s => 
        s.id === shop.id ? { ...s, ...updateData } : s
      ));
      setSelectedShop(null);
      setNewUrl("");
      restoreScrollPosition();
    } catch (error: any) {
      console.error("Error updating image:", error);
      toast.error(error.message || "Failed to update image");
    }
  };

  const handleDeleteImage = async () => {
    if (!deletingImage) return;

    try {
      if (deletingImage.brand) {
        const updateData = deletingImage.type === "logo" ? { logo_url: null } : { banner_url: null };
        const { error } = await supabase
          .from("brands")
          .update(updateData)
          .eq("id", deletingImage.brand.id);
        if (error) throw error;
        toast.success(`${deletingImage.type === "logo" ? "Logo" : "Banner"} removed from ${deletingImage.brand.name}`);
      } else if (deletingImage.shop) {
        const updateData = deletingImage.type === "shop-logo" ? { logo_url: null } : { image_url: null };
        const { error } = await supabase
          .from("shops")
          .update(updateData)
          .eq("id", deletingImage.shop.id);
        if (error) throw error;
        toast.success(`${deletingImage.type === "shop-logo" ? "Logo" : "Image"} removed from ${deletingImage.shop.name}`);
      }
      // Update state locally to preserve scroll position
      if (deletingImage.brand) {
        setBrands(prev => prev.map(b => 
          b.id === deletingImage.brand!.id 
            ? { ...b, ...(deletingImage.type === "logo" ? { logo_url: null } : { banner_url: null }) }
            : b
        ));
      } else if (deletingImage.shop) {
        setShops(prev => prev.map(s => 
          s.id === deletingImage.shop!.id 
            ? { ...s, ...(deletingImage.type === "shop-logo" ? { logo_url: null } : { image_url: null }) }
            : s
        ));
      }
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast.error(error.message || "Failed to delete image");
    } finally {
      setDeletingImage(null);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const isUploadDialogOpen = !!(selectedBrand || selectedShop);
  const uploadDialogName = selectedBrand?.name || selectedShop?.name || "";
  const uploadDialogLabel = selectedBrand 
    ? (uploadType === "logo" ? "Update Logo" : "Update Banner") 
    : (uploadType === "shop-logo" ? "Update Logo" : "Update Image");

  const BrandImageCard = ({ brand }: { brand: Brand }) => (
    <div className="border rounded-lg p-4 space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{brand.name}</h3>
        <span className="text-xs text-muted-foreground">{brand.country || "No country"}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Logo Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Logo</Label>
          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={`${brand.name} logo`}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs">No logo</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setSelectedBrand(brand);
                setSelectedShop(null);
                setUploadType("logo");
                setNewUrl(brand.logo_url || "");
              }}
            >
              {brand.logo_url ? "Replace" : "Add"}
            </Button>
            {brand.logo_url && (
              <>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(brand.logo_url!)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeletingImage({ brand, type: "logo" })}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Banner Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Banner</Label>
          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
            {brand.banner_url ? (
              <img
                src={brand.banner_url}
                alt={`${brand.name} banner`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs">No banner</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setSelectedBrand(brand);
                setSelectedShop(null);
                setUploadType("banner");
                setNewUrl(brand.banner_url || "");
              }}
            >
              {brand.banner_url ? "Replace" : "Add"}
            </Button>
            {brand.banner_url && (
              <>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(brand.banner_url!)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeletingImage({ brand, type: "banner" })}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const ShopImageCard = ({ shop }: { shop: Shop }) => (
    <div className="border rounded-lg p-4 space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{shop.name}</h3>
        <span className="text-xs text-muted-foreground">{shop.city}, {shop.country}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Logo Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Logo</Label>
          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={`${shop.name} logo`}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs">No logo</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setSelectedShop(shop);
                setSelectedBrand(null);
                setUploadType("shop-logo");
                setNewUrl(shop.logo_url || "");
              }}
            >
              {shop.logo_url ? "Replace" : "Add"}
            </Button>
            {shop.logo_url && (
              <>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(shop.logo_url!)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeletingImage({ shop, type: "shop-logo" })}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Shop Image Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Shop Image</Label>
          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
            {shop.image_url ? (
              <img
                src={shop.image_url}
                alt={`${shop.name}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <Store className="w-8 h-8 mb-1" />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setSelectedShop(shop);
                setSelectedBrand(null);
                setUploadType("shop");
                setNewUrl(shop.image_url || "");
              }}
            >
              {shop.image_url ? "Replace" : "Add"}
            </Button>
            {shop.image_url && (
              <>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(shop.image_url!)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeletingImage({ shop, type: "shop" })}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Media Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top-level Brands / Shops toggle */}
            <Tabs value={mediaTab} onValueChange={(v) => { setMediaTab(v as any); setSearchQuery(""); setCountryFilter("all"); setCategoryFilter("all"); }}>
            <TabsList className="mb-4">
              <TabsTrigger value="brands">Brands ({brands.length})</TabsTrigger>
              <TabsTrigger value="shops">Shops ({shops.length})</TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={mediaTab === "brands" ? "Search brands..." : "Search shops by name, city..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {(mediaTab === "brands" ? brandCountries : shopCountries).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(mediaTab === "brands" ? brandCategories : [...new Set(shops.map(s => s.category).filter(Boolean) as string[])].sort()).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(countryFilter !== "all" || categoryFilter !== "all" || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setCountryFilter("all"); setCategoryFilter("all"); }} className="gap-1">
                  <X className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>

            <TabsContent value="brands">
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All Brands ({brands.length})</TabsTrigger>
                  <TabsTrigger value="missing-logo">
                    Missing Logo ({brands.filter((b) => !b.logo_url).length})
                  </TabsTrigger>
                  <TabsTrigger value="missing-banner">
                    Missing Banner ({brands.filter((b) => !b.banner_url).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                    {filteredBrands.map((brand) => (
                      <BrandImageCard key={brand.id} brand={brand} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="missing-logo" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                    {filteredBrands.filter((b) => !b.logo_url).map((brand) => (
                      <BrandImageCard key={brand.id} brand={brand} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="missing-banner" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                    {filteredBrands.filter((b) => !b.banner_url).map((brand) => (
                      <BrandImageCard key={brand.id} brand={brand} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="text-sm text-muted-foreground mt-4">
                Showing {filteredBrands.length} of {brands.length} brands
              </div>
            </TabsContent>

            <TabsContent value="shops">
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All Shops ({shops.length})</TabsTrigger>
                  <TabsTrigger value="missing-logo">
                    Missing Logo ({shops.filter((s) => !s.logo_url).length})
                  </TabsTrigger>
                  <TabsTrigger value="missing-image">
                    Missing Image ({shops.filter((s) => !s.image_url).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                    {filteredShops.map((shop) => (
                      <ShopImageCard key={shop.id} shop={shop} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="missing-logo" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                    {filteredShops.filter((s) => !s.logo_url).map((shop) => (
                      <ShopImageCard key={shop.id} shop={shop} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="missing-image" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                    {filteredShops.filter((s) => !s.image_url).map((shop) => (
                      <ShopImageCard key={shop.id} shop={shop} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="text-sm text-muted-foreground mt-4">
                Showing {filteredShops.length} of {shops.length} shops
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <AlertDialog open={isUploadDialogOpen} onOpenChange={() => { setSelectedBrand(null); setSelectedShop(null); setNewUrl(""); setUploadMode("file"); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {uploadDialogLabel} for {uploadDialogName}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Upload an image file or enter a URL.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={uploadMode === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMode("file")}
                className="flex-1"
              >
                <FileUp className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              <Button
                variant={uploadMode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMode("url")}
                className="flex-1"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Enter URL
              </Button>
            </div>

            {uploadMode === "file" ? (
              <div className="space-y-2">
                <Label>Select or Drop Image File</Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                    ${isDragging 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                    }
                    ${uploading ? 'pointer-events-none opacity-50' : ''}
                  `}
                >
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium">
                        {isDragging ? 'Drop image here' : 'Click or drag image here'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        JPG, PNG, WebP, SVG (max 5MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  placeholder="https://example.com/image.png"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
            )}

            {uploadMode === "url" && newUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg p-2 bg-muted">
                  <img
                    src={newUrl}
                    alt="Preview"
                    className="max-h-32 mx-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setNewUrl(""); setUploadMode("file"); }}>Cancel</AlertDialogCancel>
            {uploadMode === "url" && (
              <AlertDialogAction
                onClick={() => {
                  if (selectedBrand) handleBrandUrlUpdate(selectedBrand, uploadType as "logo" | "banner", newUrl);
                  else if (selectedShop) handleShopUrlUpdate(selectedShop, newUrl, uploadType === "shop-logo" ? "logo" : "image");
                }}
                disabled={!newUrl}
              >
                Save
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingImage} onOpenChange={() => setDeletingImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingImage?.type === "shop" ? "image" : deletingImage?.type === "shop-logo" ? "logo" : deletingImage?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this image from {deletingImage?.brand?.name || deletingImage?.shop?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
