import { useState, useRef, useEffect } from "react";
import { normalizeSearch } from "@/lib/utils";
import { X, Camera, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrands } from "@/hooks/useBrands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import haptic from "@/lib/haptics";
import { useTranslation } from "react-i18next";
import { getCountryList } from "@/lib/countryFlags";

interface Props {
  onClose: () => void;
  onPostCreated: () => void;
}

const STYLE_TAG_OPTIONS = [
  "streetwear", "techwear", "vintage", "minimalist", "y2k",
  "gorpcore", "workwear", "avant-garde", "skate", "luxury",
  "casual", "sportswear", "grunge", "preppy", "underground", "gothic"
];

const MAX_STYLE_TAGS = 3;

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: brands = [] } = useBrands();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestedBrands, setRequestedBrands] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);

  // Auto-fill social handles from user profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("instagram_handle, tiktok_handle").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        if ((data as any).instagram_handle) setInstagramHandle((data as any).instagram_handle);
        if ((data as any).tiktok_handle) setTiktokHandle((data as any).tiktok_handle);
      }
    });
  }, [user]);

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
      if (prev.length >= MAX_STYLE_TAGS) { toast.info(t("hot.maxStyleTags")); return prev; }
      return [...prev, style];
    });
  };

  const handleAddCustomTag = () => {
    const raw = customTagInput.trim().replace(/^#/, "").trim().toLowerCase();
    if (!raw || raw.length < 2) return;
    const tag = `#${raw}`;
    if (selectedStyles.includes(tag)) { toast.info("Tag already added"); return; }
    if (selectedStyles.length >= MAX_STYLE_TAGS) { toast.info(t("hot.maxStyleTags")); return; }
    haptic.selection();
    setSelectedStyles(prev => [...prev, tag]);
    setCustomTagInput("");
    setShowCustomTagInput(false);
  };

  const handleRequestBrand = () => {
    const name = brandSearch.trim();
    if (!name || name.length < 2) return;
    if (requestedBrands.some(r => r.toLowerCase() === name.toLowerCase())) {
      toast.info("Brand already requested");
      return;
    }
    haptic.selection();
    setRequestedBrands(prev => [...prev, name]);
    setBrandSearch("");
    toast.success(`"${name}" will be suggested to our team`);
  };

  const removeRequestedBrand = (name: string) => {
    setRequestedBrands(prev => prev.filter(r => r !== name));
  };

  const filteredBrands = brandSearch.trim().length >= 2
    ? brands.filter(b => normalizeSearch(b.name).includes(normalizeSearch(brandSearch))).slice(0, 10)
    : [];

  const showRequestButton = brandSearch.trim().length >= 2 && filteredBrands.length === 0;

  const handleSubmit = async () => {
    if (!user || !imageFile) {
      toast.error(t("hot.addPhotoAndBrand"));
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
          instagram_handle: instagramHandle || null,
          tiktok_handle: tiktokHandle || null,
        } as any)
        .select("id")
        .single();

      if (postError) throw postError;

      // Insert linked brands if any selected
      if (selectedBrands.length > 0) {
        const brandInserts = selectedBrands.map(brand_id => ({
          post_id: post.id,
          brand_id,
        }));
        await supabase.from("street_spotted_post_brands").insert(brandInserts);
      }

      // Submit brand requests if any
      if (requestedBrands.length > 0) {
        const brandRequests = requestedBrands.map(brand_name => ({
          requested_by: user.id,
          brand_name,
          post_id: post.id,
        }));
        await supabase.from("brand_requests").insert(brandRequests as any);
      }

      // Auto-trigger AI outfit detection (fire-and-forget)
      supabase.functions.invoke("detect-outfit-items", {
        body: { postId: post.id, imageUrl: urlData.publicUrl },
      }).catch(err => console.warn("Auto-detect failed (non-blocking):", err));

      haptic.success();
      toast.success(t("hot.spotSubmitted"));
      onPostCreated();
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error(t("hot.postFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg mx-auto p-4 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider">{t("hot.postASpot")}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
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
          <div className="w-full aspect-[4/5] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 mb-4">
            <Camera className="w-10 h-10 text-muted-foreground" />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
              >
                📸 {t("hot.takePhoto")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                🖼️ {t("hot.fromGallery")}
              </Button>
            </div>
          </div>
        )}

        {/* Style tags */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            {t("hot.styleTags")}
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
            {/* Custom tags the user already added */}
            {selectedStyles.filter(s => s.startsWith("#")).map(tag => (
              <Badge
                key={tag}
                variant="default"
                className="cursor-pointer text-xs gap-1"
                onClick={() => toggleStyle(tag)}
              >
                {tag} <X className="w-3 h-3" />
              </Badge>
            ))}
            {/* "Other" toggle */}
            <Badge
              variant={showCustomTagInput ? "secondary" : "outline"}
              className="cursor-pointer text-xs border-dashed"
              onClick={() => {
                if (selectedStyles.length >= MAX_STYLE_TAGS && !showCustomTagInput) {
                  toast.info(t("hot.maxStyleTags"));
                  return;
                }
                setShowCustomTagInput(prev => !prev);
              }}
            >
              <Plus className="w-3 h-3 mr-0.5" /> other
            </Badge>
          </div>
          {/* Custom tag input */}
          {showCustomTagInput && (
            <div className="mt-2 flex gap-2 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">#</span>
                <Input
                  placeholder="yourtag"
                  value={customTagInput}
                  onChange={e => setCustomTagInput(e.target.value.replace(/\s/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleAddCustomTag()}
                  maxLength={24}
                  className="h-8 pl-7 text-sm"
                  autoFocus
                />
              </div>
              <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={handleAddCustomTag}>
                Add
              </Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Pick up to 3 — tap "other" to create your own #tag
          </p>
        </div>

        {/* Brand tags */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            {t("hot.tagBrands")}
          </label>
          {/* Selected existing brands */}
          {(selectedBrands.length > 0 || requestedBrands.length > 0) && (
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
              {requestedBrands.map(name => (
                <Badge
                  key={name}
                  variant="secondary"
                  className="cursor-pointer gap-1 border-dashed border"
                  onClick={() => removeRequestedBrand(name)}
                >
                  {name} <span className="text-[10px] opacity-60">(new)</span> <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}
          <Input
            placeholder={t("hot.searchBrands")}
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
          {showRequestButton && (
            <button
              onClick={handleRequestBrand}
              className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg border border-dashed border-border hover:bg-muted/50 transition-colors text-muted-foreground"
            >
              <Plus className="w-4 h-4" />
              <span>Can't find it? Request <strong className="text-foreground">"{brandSearch.trim()}"</strong></span>
            </button>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Optional — tag brands you're wearing or leave blank
          </p>
        </div>

        {/* Caption */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            {t("hot.caption")}
          </label>
          <Input
            placeholder={t("hot.captionPlaceholder")}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={280}
            className="h-9"
          />
        </div>

        {/* Social handles */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Instagram</label>
            <Input placeholder="@yourhandle" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">TikTok</label>
            <Input placeholder="@yourhandle" value={tiktokHandle} onChange={e => setTiktokHandle(e.target.value)} className="h-9" />
          </div>
        </div>

        {/* Location */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{t("hot.city")}</label>
            <Input placeholder={t("hot.cityPlaceholder")} value={city} onChange={e => setCity(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{t("hot.country")}</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("hot.countryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {getCountryList().map(c => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info about moderation */}
        <p className="text-[10px] text-muted-foreground text-center mb-3">
          {t("hot.moderationNotice")}
        </p>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !imageFile}
          className="w-full h-12 text-base font-bold"
        >
          {submitting ? t("hot.posting") : t("hot.postSpot")}
        </Button>
      </div>
    </div>
  );
};