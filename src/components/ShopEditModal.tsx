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

type Shop = Tables<"shops">;
type Brand = Tables<"brands">;

const CATEGORIES = ["streetwear", "sneakers", "accessories", "luxury", "vintage", "sportswear"];

interface ShopEditModalProps {
  shop: Shop | null;
  brands: Brand[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ShopEditModal = ({ shop, brands, isOpen, onClose, onSuccess }: ShopEditModalProps) => {
  const [formData, setFormData] = useState<Partial<Shop>>({
    name: "",
    slug: "",
    address: "",
    city: "",
    country: "",
    phone: null,
    email: null,
    official_site: null,
    latitude: null,
    longitude: null,
    description: null,
    image_url: null,
    brand_id: null,
    category: null,
    is_active: true,
    is_unique_shop: false,
    opening_hours: {
      monday: "10:00 - 19:00",
      tuesday: "10:00 - 19:00",
      wednesday: "10:00 - 19:00",
      thursday: "10:00 - 19:00",
      friday: "10:00 - 19:00",
      saturday: "10:00 - 19:00",
      sunday: "12:00 - 18:00",
    },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) {
      setFormData(shop);
    } else {
      setFormData({
        name: "",
        slug: "",
        address: "",
        city: "",
        country: "",
        phone: null,
        email: null,
        official_site: null,
        latitude: null,
        longitude: null,
        description: null,
        image_url: null,
        brand_id: null,
        category: null,
        is_active: true,
        is_unique_shop: false,
        opening_hours: {
          monday: "10:00 - 19:00",
          tuesday: "10:00 - 19:00",
          wednesday: "10:00 - 19:00",
          thursday: "10:00 - 19:00",
          friday: "10:00 - 19:00",
          saturday: "10:00 - 19:00",
          sunday: "12:00 - 18:00",
        },
      });
    }
  }, [shop, isOpen]);

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.address || !formData.city || !formData.country) {
      toast.error("Name, slug, address, city, and country are required");
      return;
    }

    setSaving(true);

    try {
      if (shop) {
        // Update existing shop
        const { error } = await supabase
          .from("shops")
          .update(formData as any)
          .eq("id", shop.id);

        if (error) throw error;

        // Log admin action
        await supabase.functions.invoke("log-security-event", {
          body: {
            eventType: "shop_updated",
            eventData: { shop_id: shop.id, shop_name: formData.name },
          },
        });

        toast.success("Shop updated successfully");
      } else {
        // Insert new shop
        const { error } = await supabase
          .from("shops")
          .insert(formData as any);

        if (error) throw error;

        // Log admin action
        await supabase.functions.invoke("log-security-event", {
          body: {
            eventType: "shop_created",
            eventData: { shop_name: formData.name },
          },
        });

        toast.success("Shop created successfully");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving shop:", error);
      toast.error(error.message || "Failed to save shop");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shop ? "Edit Shop" : "Add New Shop"}</DialogTitle>
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

          <div className="space-y-2">
            <Label htmlFor="brand_id">Brand</Label>
            <Select
              value={formData.brand_id || ""}
              onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No brand</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country || ""}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                value={formData.latitude || ""}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                value={formData.longitude || ""}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="official_site">Official Site</Label>
              <Input
                id="official_site"
                type="url"
                value={formData.official_site || ""}
                onChange={(e) => setFormData({ ...formData, official_site: e.target.value })}
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url || ""}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
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

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active || false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_unique_shop"
                checked={formData.is_unique_shop || false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_unique_shop: checked })}
              />
              <Label htmlFor="is_unique_shop">Unique Shop</Label>
            </div>
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