import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Brand = Tables<"brands">;

const COUNTRIES = ["USA", "UK", "France", "Italy", "Japan", "South Korea", "China", "Brazil", "Chile", "UAE", "Kenya"];
const CATEGORIES = ["streetwear", "sneakers", "accessories", "luxury", "vintage", "sportswear"];

interface BrandEditModalProps {
  brand: Brand | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BrandEditModal = ({ brand, isOpen, onClose, onSuccess }: BrandEditModalProps) => {
  const [formData, setFormData] = useState<Partial<Brand>>({
    name: "",
    slug: "",
    country: null,
    instagram_url: null,
    tiktok_url: null,
    official_website: null,
    description: null,
    history: null,
    logo_url: null,
    banner_url: null,
    category: null,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brand) {
      setFormData(brand);
    } else {
      setFormData({
        name: "",
        slug: "",
        country: null,
        instagram_url: null,
        tiktok_url: null,
        official_website: null,
        description: null,
        history: null,
        logo_url: null,
        banner_url: null,
        category: null,
        is_active: true,
      });
    }
  }, [brand, isOpen]);

  const validateUrl = (url: string | null) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }

    if (formData.instagram_url && !validateUrl(formData.instagram_url)) {
      toast.error("Invalid Instagram URL");
      return;
    }

    if (formData.tiktok_url && !validateUrl(formData.tiktok_url)) {
      toast.error("Invalid TikTok URL");
      return;
    }

    if (formData.official_website && !validateUrl(formData.official_website)) {
      toast.error("Invalid website URL");
      return;
    }

    setSaving(true);

    try {
      if (brand) {
        // Update existing brand
        const { error } = await supabase
          .from("brands")
          .update(formData as any)
          .eq("id", brand.id);

        if (error) throw error;

        // Log admin action
        await supabase.functions.invoke("log-security-event", {
          body: {
            eventType: "brand_updated",
            eventData: { brand_id: brand.id, brand_name: formData.name },
          },
        });

        toast.success("Brand updated successfully");
      } else {
        // Insert new brand
        const { error } = await supabase
          .from("brands")
          .insert(formData as any);

        if (error) throw error;

        // Log admin action
        await supabase.functions.invoke("log-security-event", {
          body: {
            eventType: "brand_created",
            eventData: { brand_name: formData.name },
          },
        });

        toast.success("Brand created successfully");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving brand:", error);
      toast.error(error.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{brand ? "Edit Brand" : "Add New Brand"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug || ""}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country || ""}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category || ""}
                onValueChange={(value) => setFormData({ ...formData, category: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram URL</Label>
            <Input
              id="instagram_url"
              type="url"
              placeholder="https://instagram.com/..."
              value={formData.instagram_url || ""}
              onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok_url">TikTok URL</Label>
            <Input
              id="tiktok_url"
              type="url"
              placeholder="https://tiktok.com/@..."
              value={formData.tiktok_url || ""}
              onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="official_website">Official Website</Label>
            <Input
              id="official_website"
              type="url"
              placeholder="https://..."
              value={formData.official_website || ""}
              onChange={(e) => setFormData({ ...formData, official_website: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              placeholder="/brands/brand-logo.png"
              value={formData.logo_url || ""}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner_url">Banner URL</Label>
            <Input
              id="banner_url"
              type="url"
              placeholder="/brands/brand-banner.jpg"
              value={formData.banner_url || ""}
              onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="history">History</Label>
            <Textarea
              id="history"
              rows={4}
              value={formData.history || ""}
              onChange={(e) => setFormData({ ...formData, history: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active || false}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};