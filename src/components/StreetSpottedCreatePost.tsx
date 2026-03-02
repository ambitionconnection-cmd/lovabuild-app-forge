import { useState, useRef } from "react";
import { X, Camera, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrands } from "@/hooks/useBrands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import haptic from "@/lib/haptics";

interface Props {
  onClose: () => void;
  onPostCreated: () => void;
}

const STYLE_TAG_OPTIONS = [
  "streetwear", "techwear", "vintage", "minimalist", "y2k",
  "gorpcore", "workwear", "avant-garde", "skate", "luxury",
  "casual", "sportswear", "grunge", "preppy"
];

const resizeImage = (file: File, maxWidth: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Failed to resize")), "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const StreetSpottedCreatePost = ({ onClose, onPostCreated }: Props) => {
  const { user } = useAuth();
  const { data: brands = [] } = useBrands();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const toggleBrand = (brandId: string) => {
    haptic.selection();
    setSelectedBrands(prev =>
      prev.includes(brandId) ? prev.filter(id => id !== brandId) : [...prev, brandId]
    );
    setBrandSearch("");
  };

  const toggleStyle = (style: string) => {
    haptic.selection();
    setSelectedStyles(prev => {
      if (prev.includes(style)) return prev.filter(s => s !== style);
      if (prev.length >= 3) { toast.info("Max 3 style tags"); return prev; }
      return [...prev, style];
    });
  };

  const filteredBrands = brandSearch
    ? brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).slice(0, 10)
    : [];

  const handleSubmit = async () => {
    if (!user || !imageFile || selectedBrands.length === 0) {
      toast.error("Please add a photo and tag at least one brand");
      return;
    }

    setSubmitting(true);
    try {
      const resized = await resizeImage(imageFile, 1200);
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("street-spotted")
        .upload(fileName, resized, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("street-spotted").getPublicUrl(fileName);

      const { data: post, error: postError } = await supabase
        .from("street_spotted_posts")
        .insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
          caption: caption || null,
          city: city || null,
          country: country || null,
          style_tags: selectedStyles,
        } as any)
        .select("id")
        .single();

      if (postError) throw postError;

      const brandInserts = selectedBrands.map(brand_id => ({
        post_id: post.id,
        brand_id,
      }));
      await supabase.from("street_spotted_post_brands").insert(brandInserts);

      haptic.success();
      toast.success("Spot submitted for review! 🔥");
      onPostCreated();
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error("Failed to post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider">Post a Spot</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {imagePreview ? (
          <div className="relative mb-4 rounded-xl overflow-hidden">
            <img src={imagePreview} alt="Preview" className="w-full aspect-[4/5] object-cover" />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[4/5] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 mb-4 hover:border-primary/50 transition-colors"
          >
            <Camera className="w-10 h-10 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Tap to add photo</span>
          </button>
        )}

        {/* Style tags */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Style Tags (pick up to 3)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_TAG_OPTIONS.map(style => (
              <Badge
                key={style}
                variant={selectedStyles.includes(style) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleStyle(style)}
              >
                {style}
              </Badge>
            ))}
          </div>
        </div>

        {/* Brand tags */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Tag Brands *
          </label>
          {selectedBrands.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedBrands.map(id => {
                const brand = brands.find(b => b.id === id);
                return brand ? (
                  <Badge
                    key={id}
                    variant="default"
                    className="cursor-pointer gap-1"
                    onClick={() => toggleBrand(id)}
                  >
                    {brand.name} <X className="w-3 h-3" />
                  </Badge>
                ) : null;
              })}
            </div>
          )}
          <Input
            placeholder="Search brands..."
            value={brandSearch}
            onChange={e => setBrandSearch(e.target.value)}
            className="h-9"
          />
          {filteredBrands.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-card">
              {filteredBrands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => toggleBrand(brand.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  {brand.logo_url && (
                    <img src={brand.logo_url} alt="" className="w-5 h-5 object-contain" />
                  )}
                  <span>{brand.name}</span>
                  {selectedBrands.includes(brand.id) && <Check className="w-4 h-4 ml-auto text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Caption
          </label>
          <Input
            placeholder="Describe the fit..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={280}
            className="h-9"
          />
        </div>

        {/* Location */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">City</label>
            <Input placeholder="e.g. London" value={city} onChange={e => setCity(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Country</label>
            <Input placeholder="e.g. UK" value={country} onChange={e => setCountry(e.target.value)} className="h-9" />
          </div>
        </div>

        {/* Info about moderation */}
        <p className="text-[10px] text-muted-foreground text-center mb-3">
          Posts are reviewed before appearing publicly
        </p>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !imageFile || selectedBrands.length === 0}
          className="w-full h-12 text-base font-bold"
        >
          {submitting ? "Posting..." : "Post Spot 🔥"}
        </Button>
      </div>
    </div>
  );
};
