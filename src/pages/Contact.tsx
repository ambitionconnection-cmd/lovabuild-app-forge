import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, AlertCircle, Megaphone, MessageCircle, Store, Upload, Globe, Instagram, Camera, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TikTokIcon } from "@/components/icons/TikTokIcon";

type InquiryType = "new-brand" | "new-shop" | "correction" | "partnership" | "other";

const CATEGORIES = [
  { value: "streetwear", label: "Streetwear" },
  { value: "sneakers", label: "Sneakers" },
  { value: "accessories", label: "Accessories" },
  { value: "luxury", label: "Luxury" },
  { value: "vintage", label: "Vintage" },
  { value: "sportswear", label: "Sportswear" },
  { value: "contemporary", label: "Contemporary" },
  { value: "techwear", label: "Techwear" },
  { value: "outdoor", label: "Outdoor / Gorpcore" },
  { value: "heritage", label: "Heritage / Workwear" },
  { value: "designer", label: "Designer" },
  { value: "skate", label: "Skate" },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize",
  "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala",
  "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hong Kong", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
  "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
  "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
  "Other",
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

const Contact = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<InquiryType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generic form data
  const [genericFormData, setGenericFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  // New Brand form data
  const [brandFormData, setBrandFormData] = useState({
    brandName: "",
    submitterName: "",
    submitterEmail: "",
    shortDescription: "",
    fullDescription: "",
    websiteUrl: "",
    instagramHandle: "",
    tiktokHandle: "",
    country: "",
    category: "",
    stockists: "",
  });

  // Brand image uploads
  const [brandLogo, setBrandLogo] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState<string | null>(null);
  const [brandPhotos, setBrandPhotos] = useState<File[]>([]);
  const [brandPhotosPreviews, setBrandPhotosPreviews] = useState<string[]>([]);
  const brandLogoRef = useRef<HTMLInputElement>(null);
  const brandPhotosRef = useRef<HTMLInputElement>(null);

  // New Shop form data
  const [shopFormData, setShopFormData] = useState({
    shopName: "",
    address: "",
    city: "",
    country: "",
    category: "",
    websiteUrl: "",
    instagramHandle: "",
    phone: "",
    email: "",
    description: "",
    submitterName: "",
    submitterEmail: "",
  });

  // Shop image uploads
  const [shopLogo, setShopLogo] = useState<File | null>(null);
  const [shopLogoPreview, setShopLogoPreview] = useState<string | null>(null);
  const [shopPhotos, setShopPhotos] = useState<File[]>([]);
  const [shopPhotosPreviews, setShopPhotosPreviews] = useState<string[]>([]);
  const shopLogoRef = useRef<HTMLInputElement>(null);
  const shopPhotosRef = useRef<HTMLInputElement>(null);

  const inquiryOptions = [
    {
      type: "new-brand" as InquiryType,
      icon: Building2,
      title: t('contact.newBrand'),
      description: t('contact.newBrandDesc'),
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      type: "new-shop" as InquiryType,
      icon: Store,
      title: "Submit a New Shop",
      description: "Know a great streetwear shop? Help us map it for the community.",
      color: "text-[#C4956A]",
      bgColor: "bg-[#C4956A]/10"
    },
    {
      type: "correction" as InquiryType,
      icon: AlertCircle,
      title: t('contact.reportIssue'),
      description: t('contact.reportIssueDesc'),
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      type: "partnership" as InquiryType,
      icon: Megaphone,
      title: t('contact.partnership'),
      description: t('contact.partnershipDesc'),
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      type: "other" as InquiryType,
      icon: MessageCircle,
      title: t('contact.other'),
      description: t('contact.otherDesc'),
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  // ── Image helpers ──
  const handleImageSelect = async (
    file: File,
    setFile: (f: File) => void,
    setPreview: (url: string) => void
  ) => {
    const resized = await resizeImage(file, 800);
    const resizedFile = new File([resized], file.name, { type: 'image/jpeg' });
    setFile(resizedFile);
    setPreview(URL.createObjectURL(resized));
  };

  const handleMultiImageSelect = async (
    files: FileList,
    currentFiles: File[],
    currentPreviews: string[],
    setFiles: (f: File[]) => void,
    setPreviews: (urls: string[]) => void,
    max: number = 5
  ) => {
    const remaining = max - currentFiles.length;
    const toAdd = Array.from(files).slice(0, remaining);
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (const file of toAdd) {
      const resized = await resizeImage(file, 1200);
      newFiles.push(new File([resized], file.name, { type: 'image/jpeg' }));
      newPreviews.push(URL.createObjectURL(resized));
    }
    setFiles([...currentFiles, ...newFiles]);
    setPreviews([...currentPreviews, ...newPreviews]);
  };

  const removePhoto = (
    index: number,
    files: File[],
    previews: string[],
    setFiles: (f: File[]) => void,
    setPreviews: (urls: string[]) => void
  ) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const uploadImages = async (files: File[], folder: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from('brand-images').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('brand-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  // ── Submit handlers ──
  const handleGenericSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    if (!genericFormData.name || !genericFormData.email || !genericFormData.message) {
      toast.error(t('contact.fillRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: genericFormData.name,
          email: genericFormData.email,
          subject: genericFormData.subject,
          message: genericFormData.message,
          inquiry_type: selectedType
        });
      if (error) throw error;
      toast.success(t('contact.messageSent'));
      setGenericFormData({ name: "", email: "", subject: "", message: "" });
      setSelectedType(null);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error(t('contact.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandFormData.brandName || !brandFormData.submitterEmail || !brandFormData.shortDescription || 
        !brandFormData.websiteUrl || !brandFormData.instagramHandle || !brandFormData.country || !brandFormData.category) {
      toast.error(t('contact.fillRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload images if provided
      let logoUrl = "";
      let photoUrls: string[] = [];
      if (brandLogo) {
        const urls = await uploadImages([brandLogo], 'brand-submissions');
        logoUrl = urls[0] || "";
      }
      if (brandPhotos.length > 0) {
        photoUrls = await uploadImages(brandPhotos, 'brand-submissions');
      }

      const structuredMessage = `
=== NEW BRAND SUBMISSION ===

Brand Name: ${brandFormData.brandName}
Category: ${brandFormData.category}
Country: ${brandFormData.country}

Short Description:
${brandFormData.shortDescription}

Full Description:
${brandFormData.fullDescription || "Not provided"}

Website: ${brandFormData.websiteUrl}
Instagram: @${brandFormData.instagramHandle.replace("@", "")}
TikTok: ${brandFormData.tiktokHandle ? "@" + brandFormData.tiktokHandle.replace("@", "") : "Not provided"}

Stockists/Where to Buy:
${brandFormData.stockists || "Not provided"}

Logo: ${logoUrl || "Not provided"}
Photos: ${photoUrls.length > 0 ? photoUrls.join('\n') : "Not provided"}

---
Submitted by: ${brandFormData.submitterName || "Anonymous"}
Email: ${brandFormData.submitterEmail}
      `.trim();

      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: brandFormData.submitterName || "Brand Submission",
          email: brandFormData.submitterEmail,
          subject: `NEW BRAND: ${brandFormData.brandName}`,
          message: structuredMessage,
          inquiry_type: "new-brand"
        });
      if (error) throw error;
      toast.success(t('contact.brandSubmitted'));
      setBrandFormData({ brandName: "", submitterName: "", submitterEmail: "", shortDescription: "", fullDescription: "", websiteUrl: "", instagramHandle: "", tiktokHandle: "", country: "", category: "", stockists: "" });
      setBrandLogo(null); setBrandLogoPreview(null); setBrandPhotos([]); setBrandPhotosPreviews([]);
      setSelectedType(null);
    } catch (error) {
      console.error("Error submitting brand:", error);
      toast.error(t('contact.brandSubmitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopFormData.shopName || !shopFormData.address || !shopFormData.city || !shopFormData.country || !shopFormData.submitterEmail) {
      toast.error(t('contact.fillRequired'));
      return;
    }
    if (shopPhotos.length === 0) {
      toast.error("Please add at least one photo of the shop");
      return;
    }
    setIsSubmitting(true);
    try {
      let logoUrl = "";
      let photoUrls: string[] = [];
      if (shopLogo) {
        const urls = await uploadImages([shopLogo], 'shop-submissions');
        logoUrl = urls[0] || "";
      }
      if (shopPhotos.length > 0) {
        photoUrls = await uploadImages(shopPhotos, 'shop-submissions');
      }

      const structuredMessage = `
=== NEW SHOP SUBMISSION ===

Shop Name: ${shopFormData.shopName}
Address: ${shopFormData.address}
City: ${shopFormData.city}
Country: ${shopFormData.country}
Category: ${shopFormData.category || "Not specified"}

Website: ${shopFormData.websiteUrl || "Not provided"}
Instagram: ${shopFormData.instagramHandle ? "@" + shopFormData.instagramHandle.replace("@", "") : "Not provided"}
Phone: ${shopFormData.phone || "Not provided"}
Email: ${shopFormData.email || "Not provided"}

Description:
${shopFormData.description || "Not provided"}

Logo: ${logoUrl || "Not provided"}
Photos: ${photoUrls.join('\n')}

---
Submitted by: ${shopFormData.submitterName || "Anonymous"}
Email: ${shopFormData.submitterEmail}
      `.trim();

      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: shopFormData.submitterName || "Shop Submission",
          email: shopFormData.submitterEmail,
          subject: `NEW SHOP: ${shopFormData.shopName} (${shopFormData.city})`,
          message: structuredMessage,
          inquiry_type: "new-shop"
        });
      if (error) throw error;
      toast.success("Shop submitted for review! We'll add it to the map soon.");
      setShopFormData({ shopName: "", address: "", city: "", country: "", category: "", websiteUrl: "", instagramHandle: "", phone: "", email: "", description: "", submitterName: "", submitterEmail: "" });
      setShopLogo(null); setShopLogoPreview(null); setShopPhotos([]); setShopPhotosPreviews([]);
      setSelectedType(null);
    } catch (error) {
      console.error("Error submitting shop:", error);
      toast.error("Failed to submit shop. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Image upload UI component ──
  const ImageUploadSection = ({
    label,
    file,
    preview,
    onSelect,
    onRemove,
    inputRef,
    accept = "image/*",
    isLogo = false,
  }: {
    label: string;
    file: File | null;
    preview: string | null;
    onSelect: (f: File) => void;
    onRemove: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
    accept?: string;
    isLogo?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
          e.target.value = '';
        }}
      />
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className={`${isLogo ? 'w-20 h-20 object-contain' : 'w-32 h-24 object-cover'} rounded-lg border border-border`} />
          <button type="button" onClick={onRemove} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Upload {isLogo ? 'Logo' : 'Image'}
        </Button>
      )}
    </div>
  );

  const MultiImageUpload = ({
    label,
    files,
    previews,
    onSelect,
    onRemove,
    inputRef,
    max = 5,
    required = false,
  }: {
    label: string;
    files: File[];
    previews: string[];
    onSelect: (files: FileList) => void;
    onRemove: (index: number) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    max?: number;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>{label} {required && '*'} <span className="text-muted-foreground text-xs">(max {max})</span></Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onSelect(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-2">
        {previews.map((url, i) => (
          <div key={i} className="relative">
            <img src={url} alt={`Photo ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border" />
            <button type="button" onClick={() => onRemove(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {files.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span className="text-[9px] mt-1">Add</span>
          </button>
        )}
      </div>
    </div>
  );

  // ── Brand form ──
  const renderBrandForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          {t('contact.submitBrand')}
        </CardTitle>
        <CardDescription>
          Submit a new brand to our directory. All submissions are reviewed before publishing. We do not accept dropshipping brands — you must have physical products to sell.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBrandSubmit} className="space-y-6">
          {/* Brand Information Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t('contact.brandInfo')}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="brandName">{t('contact.brandName')} *</Label>
              <Input
                id="brandName"
                placeholder="e.g. Palace, Stüssy, Aimé Leon Dore"
                value={brandFormData.brandName}
                onChange={(e) => setBrandFormData({ ...brandFormData, brandName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('drops.category')} *</Label>
                <Select 
                  value={brandFormData.category} 
                  onValueChange={(value) => setBrandFormData({ ...brandFormData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('contact.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t('contact.countryOfOrigin')} *</Label>
                <Select 
                  value={brandFormData.country} 
                  onValueChange={(value) => setBrandFormData({ ...brandFormData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('contact.selectCountry')} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">{t('contact.shortDescription')} * <span className="text-muted-foreground text-xs">{t('contact.shortDescriptionHint')}</span></Label>
              <Textarea
                id="shortDescription"
                placeholder="Elevator pitch — what makes this brand unique?"
                value={brandFormData.shortDescription}
                onChange={(e) => setBrandFormData({ ...brandFormData, shortDescription: e.target.value.slice(0, 280) })}
                className="min-h-[80px]"
                required
              />
              <p className="text-xs text-muted-foreground text-right">{brandFormData.shortDescription.length}/280</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">{t('contact.fullDescription')} <span className="text-muted-foreground text-xs">{t('contact.optional')}</span></Label>
              <Textarea
                id="fullDescription"
                placeholder="Brand story, founding, ethos, notable collaborations..."
                value={brandFormData.fullDescription}
                onChange={(e) => setBrandFormData({ ...brandFormData, fullDescription: e.target.value })}
                className="min-h-[120px]"
              />
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Brand Images</h3>
            
            <ImageUploadSection
              label="Brand Logo (optional)"
              file={brandLogo}
              preview={brandLogoPreview}
              onSelect={async (f) => await handleImageSelect(f, setBrandLogo, setBrandLogoPreview)}
              onRemove={() => { setBrandLogo(null); if (brandLogoPreview) URL.revokeObjectURL(brandLogoPreview); setBrandLogoPreview(null); }}
              inputRef={brandLogoRef as React.RefObject<HTMLInputElement>}
              isLogo
            />

            <MultiImageUpload
              label="Product / Brand Photos"
              files={brandPhotos}
              previews={brandPhotosPreviews}
              onSelect={async (files) => await handleMultiImageSelect(files, brandPhotos, brandPhotosPreviews, setBrandPhotos, setBrandPhotosPreviews)}
              onRemove={(i) => removePhoto(i, brandPhotos, brandPhotosPreviews, setBrandPhotos, setBrandPhotosPreviews)}
              inputRef={brandPhotosRef as React.RefObject<HTMLInputElement>}
              max={5}
            />
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t('contact.linksSocial')}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> {t('contact.websiteUrl')} *
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://brand-website.com"
                value={brandFormData.websiteUrl}
                onChange={(e) => setBrandFormData({ ...brandFormData, websiteUrl: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagramHandle" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> {t('contact.instagramHandle')} *
                </Label>
                <Input
                  id="instagramHandle"
                  placeholder="@brandname"
                  value={brandFormData.instagramHandle}
                  onChange={(e) => setBrandFormData({ ...brandFormData, instagramHandle: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktokHandle" className="flex items-center gap-2">
                  <TikTokIcon className="w-4 h-4" /> {t('contact.tiktokHandle')}
                </Label>
                <Input
                  id="tiktokHandle"
                  placeholder="@brandname (optional)"
                  value={brandFormData.tiktokHandle}
                  onChange={(e) => setBrandFormData({ ...brandFormData, tiktokHandle: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockists">{t('contact.stockists')} <span className="text-muted-foreground text-xs">{t('contact.optional')}</span></Label>
              <Textarea
                id="stockists"
                placeholder="List online stores and physical shops that carry this brand..."
                value={brandFormData.stockists}
                onChange={(e) => setBrandFormData({ ...brandFormData, stockists: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Submitter Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Your Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="submitterName">Your Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="submitterName"
                  placeholder="Your name"
                  value={brandFormData.submitterName}
                  onChange={(e) => setBrandFormData({ ...brandFormData, submitterName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submitterEmail">{t('contact.yourEmail')} *</Label>
                <Input
                  id="submitterEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={brandFormData.submitterEmail}
                  onChange={(e) => setBrandFormData({ ...brandFormData, submitterEmail: e.target.value })}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('contact.notifyOnReview')}</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? t('contact.submitting') : t('contact.submitBrandBtn')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelectedType(null)}>
              {t('contact.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  // ── Shop form ──
  const renderShopForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5 text-[#C4956A]" />
          Submit a New Shop
        </CardTitle>
        <CardDescription>
          Help us map streetwear shops around the world. We want to help shops grow by sending them people and traffic. All submissions are reviewed before publishing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleShopSubmit} className="space-y-6">
          {/* Shop Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Shop Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name *</Label>
              <Input
                id="shopName"
                placeholder="e.g. Dover Street Market, Slam Jam"
                value={shopFormData.shopName}
                onChange={(e) => setShopFormData({ ...shopFormData, shopName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopAddress">Full Address *</Label>
              <Input
                id="shopAddress"
                placeholder="e.g. 18-22 Haymarket, London SW1Y 4DG"
                value={shopFormData.address}
                onChange={(e) => setShopFormData({ ...shopFormData, address: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopCity">City *</Label>
                <Input
                  id="shopCity"
                  placeholder="e.g. London, Tokyo, Paris"
                  value={shopFormData.city}
                  onChange={(e) => setShopFormData({ ...shopFormData, city: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopCountry">Country *</Label>
                <Select 
                  value={shopFormData.country} 
                  onValueChange={(value) => setShopFormData({ ...shopFormData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopCategory">Category</Label>
              <Select 
                value={shopFormData.category} 
                onValueChange={(value) => setShopFormData({ ...shopFormData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopDescription">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="shopDescription"
                placeholder="What makes this shop special? What brands do they carry?"
                value={shopFormData.description}
                onChange={(e) => setShopFormData({ ...shopFormData, description: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Shop Images */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Shop Images</h3>
            
            <ImageUploadSection
              label="Shop Logo (optional)"
              file={shopLogo}
              preview={shopLogoPreview}
              onSelect={async (f) => await handleImageSelect(f, setShopLogo, setShopLogoPreview)}
              onRemove={() => { setShopLogo(null); if (shopLogoPreview) URL.revokeObjectURL(shopLogoPreview); setShopLogoPreview(null); }}
              inputRef={shopLogoRef as React.RefObject<HTMLInputElement>}
              isLogo
            />

            <MultiImageUpload
              label="Shop Photos"
              files={shopPhotos}
              previews={shopPhotosPreviews}
              onSelect={async (files) => await handleMultiImageSelect(files, shopPhotos, shopPhotosPreviews, setShopPhotos, setShopPhotosPreviews)}
              onRemove={(i) => removePhoto(i, shopPhotos, shopPhotosPreviews, setShopPhotos, setShopPhotosPreviews)}
              inputRef={shopPhotosRef as React.RefObject<HTMLInputElement>}
              max={5}
              required
            />
            <p className="text-xs text-muted-foreground">At least one photo of the shop is required</p>
          </div>

          {/* Contact & Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Shop Contact & Links</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopWebsite" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Website
                </Label>
                <Input
                  id="shopWebsite"
                  type="url"
                  placeholder="https://shop-website.com (optional)"
                  value={shopFormData.websiteUrl}
                  onChange={(e) => setShopFormData({ ...shopFormData, websiteUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopInstagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> Instagram
                </Label>
                <Input
                  id="shopInstagram"
                  placeholder="@shopname (optional)"
                  value={shopFormData.instagramHandle}
                  onChange={(e) => setShopFormData({ ...shopFormData, instagramHandle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopPhone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="shopPhone"
                  type="tel"
                  placeholder="+44 20 7000 0000"
                  value={shopFormData.phone}
                  onChange={(e) => setShopFormData({ ...shopFormData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopEmail">Shop Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="shopEmail"
                  type="email"
                  placeholder="hello@shop.com"
                  value={shopFormData.email}
                  onChange={(e) => setShopFormData({ ...shopFormData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Submitter */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Your Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopSubmitterName">Your Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="shopSubmitterName"
                  placeholder="Your name"
                  value={shopFormData.submitterName}
                  onChange={(e) => setShopFormData({ ...shopFormData, submitterName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopSubmitterEmail">Your Email *</Label>
                <Input
                  id="shopSubmitterEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={shopFormData.submitterEmail}
                  onChange={(e) => setShopFormData({ ...shopFormData, submitterEmail: e.target.value })}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('contact.notifyOnReview')}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-[#C4956A] hover:bg-[#C4956A]/90" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Shop"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelectedType(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderGenericForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          {inquiryOptions.find(o => o.type === selectedType)?.title}
        </CardTitle>
        <CardDescription>
          {inquiryOptions.find(o => o.type === selectedType)?.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenericSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('contact.name')} *</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={genericFormData.name}
              onChange={(e) => setGenericFormData({ ...genericFormData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('contact.email')} *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={genericFormData.email}
              onChange={(e) => setGenericFormData({ ...genericFormData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">{t('contact.subject')}</Label>
            <Input
              id="subject"
              placeholder="Brief description"
              value={genericFormData.subject}
              onChange={(e) => setGenericFormData({ ...genericFormData, subject: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t('contact.message')} *</Label>
            <Textarea
              id="message"
              placeholder="Tell us more about your inquiry..."
              value={genericFormData.message}
              onChange={(e) => setGenericFormData({ ...genericFormData, message: e.target.value })}
              className="min-h-[150px]"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelectedType(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pt-0 lg:pt-14">
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('nav.back')}
          </Button>
          <h1 className="text-xl font-bold">{t('contact.title')}</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {!selectedType ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">{t('contact.howCanWeHelp')}</h2>
              <p className="text-muted-foreground">{t('contact.selectOption')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inquiryOptions.map((option) => {
                const Icon = option.icon;
                const isMainAction = option.type === "new-brand" || option.type === "new-shop";
                return (
                  <Card
                    key={option.type}
                    className={`cursor-pointer hover:scale-[1.02] transition-all hover:border-primary ${
                      isMainAction ? "md:col-span-1 border-2" : ""
                    } ${option.type === "new-brand" ? "border-primary/50" : ""} ${option.type === "new-shop" ? "border-[#C4956A]/50" : ""}`}
                    onClick={() => setSelectedType(option.type)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${option.bgColor} ${option.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className={`text-lg ${isMainAction ? "uppercase tracking-wider" : ""}`}>
                            {option.title}
                          </CardTitle>
                          <CardDescription className="mt-1">{option.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground pt-4">
              {t('contact.contribute')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setSelectedType(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('contact.backToOptions')}
            </Button>

            {selectedType === "new-brand" && renderBrandForm()}
            {selectedType === "new-shop" && renderShopForm()}
            {(selectedType === "correction" || selectedType === "partnership" || selectedType === "other") && renderGenericForm()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Contact;
