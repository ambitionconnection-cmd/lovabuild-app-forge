import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface BrandImageGeneratorProps {
  brands: Tables<'brands'>[];
  onComplete: () => void;
}

export const BrandImageGenerator = ({ brands, onComplete }: BrandImageGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const generateImagesForAllBrands = async () => {
    setGenerating(true);
    const brandsNeedingImages = brands.filter(b => !b.logo_url || !b.banner_url);
    setProgress({ current: 0, total: brandsNeedingImages.length });

    for (let i = 0; i < brandsNeedingImages.length; i++) {
      const brand = brandsNeedingImages[i];
      
      try {
        // Call edge function to generate images
        const { data, error } = await supabase.functions.invoke('generate-brand-images', {
          body: {
            brandName: brand.name,
            brandCategory: brand.category,
            brandCountry: brand.country
          }
        });

        if (error) throw error;

        if (data.success) {
          // Update brand with new image URLs
          await supabase
            .from('brands')
            .update({
              logo_url: data.logoUrl,
              banner_url: data.bannerUrl
            })
            .eq('id', brand.id);

          setProgress({ current: i + 1, total: brandsNeedingImages.length });
          toast.success(`Generated images for ${brand.name}`);
        }
      } catch (error) {
        console.error(`Error generating images for ${brand.name}:`, error);
        toast.error(`Failed to generate images for ${brand.name}`);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setGenerating(false);
    toast.success('All brand images generated!');
    onComplete();
  };

  const brandsNeedingImages = brands.filter(b => !b.logo_url || !b.banner_url).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Brand Images</CardTitle>
        <CardDescription>
          Use AI to generate logos and banner images for brands
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {brandsNeedingImages} brands need images
            </p>
            {generating && (
              <p className="text-sm text-muted-foreground">
                Progress: {progress.current} / {progress.total}
              </p>
            )}
          </div>
          <Button
            onClick={generateImagesForAllBrands}
            disabled={generating || brandsNeedingImages === 0}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                Generate All Images
              </>
            )}
          </Button>
        </div>
        {brandsNeedingImages === 0 && (
          <p className="text-sm text-muted-foreground">
            All brands already have images!
          </p>
        )}
      </CardContent>
    </Card>
  );
};