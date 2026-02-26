import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, AlertCircle, Megaphone, MessageCircle, Store, Package, Upload, Globe, Instagram } from "lucide-react";
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

type InquiryType = "new-brand" | "new-release" | "correction" | "partnership" | "other";

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
  "United Kingdom",
  "United States",
  "France",
  "Germany",
  "Italy",
  "Japan",
  "Netherlands",
  "Spain",
  "Sweden",
  "Other",
];

const Contact = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<InquiryType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generic form data (for Report Issue, Partnership, Other)
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

  // New Release form data
  const [releaseFormData, setReleaseFormData] = useState({
    brandName: "",
    productName: "",
    releaseDate: "",
    releaseTime: "",
    retailPrice: "",
    dropLocation: "",
    sourceLink: "",
    notes: "",
    submitterName: "",
    submitterEmail: "",
  });

  const inquiryOptions = [
    {
      type: "new-brand" as InquiryType,
      icon: Building2,
      title: "NEW BRAND",
      description: "Submit a streetwear brand to be added to our directory",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      type: "new-release" as InquiryType,
      icon: Package,
      title: "NEW RELEASE",
      description: "Submit an upcoming drop or release",
      color: "text-drops",
      bgColor: "bg-drops/10"
    },
    {
      type: "correction" as InquiryType,
      icon: AlertCircle,
      title: "Report Issue",
      description: "Noticed incorrect info or missing details",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      type: "partnership" as InquiryType,
      icon: Megaphone,
      title: "Partnership",
      description: "Advertising, collaborations, or offers",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      type: "other" as InquiryType,
      icon: MessageCircle,
      title: "Other",
      description: "General inquiries or feedback",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

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
      // Store in contact_submissions with structured data in message field
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
      setBrandFormData({
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
      setSelectedType(null);
    } catch (error) {
      console.error("Error submitting brand:", error);
      toast.error(t('contact.brandSubmitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!releaseFormData.brandName || !releaseFormData.productName || !releaseFormData.releaseDate || 
        !releaseFormData.dropLocation || !releaseFormData.sourceLink || !releaseFormData.submitterEmail) {
      toast.error(t('contact.fillRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Store in contact_submissions with structured data in message field
      const structuredMessage = `
=== NEW RELEASE SUBMISSION ===

Brand: ${releaseFormData.brandName}
Product: ${releaseFormData.productName}

Release Date: ${releaseFormData.releaseDate}
Release Time: ${releaseFormData.releaseTime || "Not specified"}

Retail Price: ${releaseFormData.retailPrice || "Not specified"}
Drop Location: ${releaseFormData.dropLocation}

Source Link: ${releaseFormData.sourceLink}

Notes:
${releaseFormData.notes || "None"}

---
Submitted by: ${releaseFormData.submitterName || "Anonymous"}
Email: ${releaseFormData.submitterEmail}
      `.trim();

      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: releaseFormData.submitterName || "Release Submission",
          email: releaseFormData.submitterEmail,
          subject: `NEW RELEASE: ${releaseFormData.brandName} - ${releaseFormData.productName}`,
          message: structuredMessage,
          inquiry_type: "new-release"
        });

      if (error) throw error;

      toast.success(t('contact.releaseSubmitted'));
      setReleaseFormData({
        brandName: "",
        productName: "",
        releaseDate: "",
        releaseTime: "",
        retailPrice: "",
        dropLocation: "",
        sourceLink: "",
        notes: "",
        submitterName: "",
        submitterEmail: "",
      });
      setSelectedType(null);
    } catch (error) {
      console.error("Error submitting release:", error);
      toast.error(t('contact.releaseSubmitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBrandForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          {t('contact.submitBrand')}
        </CardTitle>
        <CardDescription>
          {t('contact.submitBrandDesc')}
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

  const renderReleaseForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-drops" />
          {t('contact.submitRelease')}
        </CardTitle>
        <CardDescription>
          {t('contact.submitReleaseDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReleaseSubmit} className="space-y-6">
          {/* Release Information Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t('contact.releaseInfo')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="releaseBrandName">{t('contact.brandName')} *</Label>
                <Input
                  id="releaseBrandName"
                  placeholder="e.g. Nike, Supreme, Palace"
                  value={releaseFormData.brandName}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, brandName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">{t('contact.productName')} *</Label>
                <Input
                  id="productName"
                  placeholder="e.g. Air Max 1 'Patta Waves'"
                  value={releaseFormData.productName}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, productName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="releaseDate">{t('contact.releaseDate')} *</Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={releaseFormData.releaseDate}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, releaseDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="releaseTime">{t('contact.releaseTime')} <span className="text-muted-foreground text-xs">{t('contact.ifKnown')}</span></Label>
                <Input
                  id="releaseTime"
                  type="time"
                  value={releaseFormData.releaseTime}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, releaseTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retailPrice">{t('contact.retailPrice')} <span className="text-muted-foreground text-xs">{t('contact.retailPriceHint')}</span></Label>
                <Input
                  id="retailPrice"
                  placeholder="e.g. £150 / $180 / €160"
                  value={releaseFormData.retailPrice}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, retailPrice: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropLocation">{t('contact.dropLocation')} *</Label>
                <Input
                  id="dropLocation"
                  placeholder="e.g. SNKRS App, Palace Website, In-store only"
                  value={releaseFormData.dropLocation}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, dropLocation: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceLink">{t('contact.sourceLink')} *</Label>
              <Input
                id="sourceLink"
                type="url"
                placeholder="Link to official announcement, Instagram post, etc."
                value={releaseFormData.sourceLink}
                onChange={(e) => setReleaseFormData({ ...releaseFormData, sourceLink: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">{t('contact.sourceLinkHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseNotes">{t('contact.additionalNotes')} <span className="text-muted-foreground text-xs">{t('contact.optional')}</span></Label>
              <Textarea
                id="releaseNotes"
                placeholder="Limited edition? Raffle? Region exclusive? Any extra context..."
                value={releaseFormData.notes}
                onChange={(e) => setReleaseFormData({ ...releaseFormData, notes: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Submitter Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t('contact.yourInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="releaseSubmitterName">{t('contact.yourName')} <span className="text-muted-foreground text-xs">{t('contact.optional')}</span></Label>
                <Input
                  id="releaseSubmitterName"
                  placeholder="Your name"
                  value={releaseFormData.submitterName}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, submitterName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="releaseSubmitterEmail">{t('contact.yourEmail')} *</Label>
                <Input
                  id="releaseSubmitterEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={releaseFormData.submitterEmail}
                  onChange={(e) => setReleaseFormData({ ...releaseFormData, submitterEmail: e.target.value })}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('contact.notifyOnReview')}</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-drops hover:bg-drops/90" disabled={isSubmitting}>
              {isSubmitting ? t('contact.submitting') : t('contact.submitReleaseBtn')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelectedType(null)}>
              {t('contact.cancel')}
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
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('nav.back')}
          </Button>
          <h1 className="text-xl font-bold">{t('contact.title')}</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
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
                const isMainAction = option.type === "new-brand" || option.type === "new-release";
                return (
                  <Card
                    key={option.type}
                    className={`cursor-pointer hover:scale-[1.02] transition-all hover:border-primary ${
                      isMainAction ? "md:col-span-1 border-2" : ""
                    } ${option.type === "new-brand" ? "border-primary/50" : ""} ${option.type === "new-release" ? "border-drops/50" : ""}`}
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
            {selectedType === "new-release" && renderReleaseForm()}
            {(selectedType === "correction" || selectedType === "partnership" || selectedType === "other") && renderGenericForm()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Contact;