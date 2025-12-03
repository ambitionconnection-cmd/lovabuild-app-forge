import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, Search, Trash2, Copy, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Brand = Tables<"brands">;

export const MediaManagement = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"logo" | "banner">("logo");
  const [newUrl, setNewUrl] = useState("");
  const [deletingImage, setDeletingImage] = useState<{ brand: Brand; type: "logo" | "banner" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name");

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUrlUpdate = async (brand: Brand, type: "logo" | "banner", url: string) => {
    try {
      const updateData = type === "logo" ? { logo_url: url || null } : { banner_url: url || null };
      
      const { error } = await supabase
        .from("brands")
        .update(updateData)
        .eq("id", brand.id);

      if (error) throw error;

      await supabase.functions.invoke("log-security-event", {
        body: {
          eventType: `brand_${type}_updated`,
          eventData: { brand_id: brand.id, brand_name: brand.name, new_url: url },
        },
      });

      toast.success(`${type === "logo" ? "Logo" : "Banner"} updated for ${brand.name}`);
      fetchBrands();
      setSelectedBrand(null);
      setNewUrl("");
    } catch (error: any) {
      console.error("Error updating image:", error);
      toast.error(error.message || "Failed to update image");
    }
  };

  const handleDeleteImage = async () => {
    if (!deletingImage) return;

    try {
      const updateData = deletingImage.type === "logo" ? { logo_url: null } : { banner_url: null };
      
      const { error } = await supabase
        .from("brands")
        .update(updateData)
        .eq("id", deletingImage.brand.id);

      if (error) throw error;

      await supabase.functions.invoke("log-security-event", {
        body: {
          eventType: `brand_${deletingImage.type}_deleted`,
          eventData: { brand_id: deletingImage.brand.id, brand_name: deletingImage.brand.name },
        },
      });

      toast.success(`${deletingImage.type === "logo" ? "Logo" : "Banner"} removed from ${deletingImage.brand.name}`);
      fetchBrands();
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
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
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
                setUploadType("logo");
                setNewUrl(brand.logo_url || "");
              }}
            >
              {brand.logo_url ? "Replace" : "Add"}
            </Button>
            {brand.logo_url && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(brand.logo_url!)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingImage({ brand, type: "logo" })}
                >
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
                setUploadType("banner");
                setNewUrl(brand.banner_url || "");
              }}
            >
              {brand.banner_url ? "Replace" : "Add"}
            </Button>
            {brand.banner_url && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(brand.banner_url!)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingImage({ brand, type: "banner" })}
                >
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
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

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
                {filteredBrands
                  .filter((b) => !b.logo_url)
                  .map((brand) => (
                    <BrandImageCard key={brand.id} brand={brand} />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="missing-banner" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {filteredBrands
                  .filter((b) => !b.banner_url)
                  .map((brand) => (
                    <BrandImageCard key={brand.id} brand={brand} />
                  ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-sm text-muted-foreground">
            Showing {filteredBrands.length} of {brands.length} brands
          </div>
        </CardContent>
      </Card>

      {/* URL Update Dialog */}
      <AlertDialog open={!!selectedBrand} onOpenChange={() => setSelectedBrand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {uploadType === "logo" ? "Update Logo" : "Update Banner"} for {selectedBrand?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Enter the URL of the new {uploadType}. Use a public URL (e.g., from /brands/ folder or an external CDN).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                placeholder={`/brands/${selectedBrand?.slug || "brand"}-${uploadType}.png`}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                For local images, use paths like: /brands/brand-name-logo.png
              </p>
            </div>

            {newUrl && (
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
            <AlertDialogCancel onClick={() => setNewUrl("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBrand && handleUrlUpdate(selectedBrand, uploadType, newUrl)}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingImage} onOpenChange={() => setDeletingImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingImage?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {deletingImage?.type} from {deletingImage?.brand.name}?
              This will clear the URL reference but won't delete the actual file.
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
