import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Drop = Tables<'drops'>;
type Brand = Tables<'brands'>;
type Shop = Tables<'shops'>;

interface DropEditModalProps {
  drop: Drop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DropEditModal({ drop, open, onOpenChange, onSuccess }: DropEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    video_url: '',
    release_date: '',
    status: 'upcoming' as 'upcoming' | 'live' | 'ended',
    brand_id: '',
    shop_id: '',
    affiliate_link: '',
    discount_code: '',
    is_featured: false,
    is_pro_exclusive: false,
    product_images: [] as string[],
  });

  useEffect(() => {
    if (drop) {
      setFormData({
        title: drop.title || '',
        slug: drop.slug || '',
        description: drop.description || '',
        image_url: drop.image_url || '',
        video_url: drop.video_url || '',
        release_date: drop.release_date ? new Date(drop.release_date).toISOString().slice(0, 16) : '',
        status: drop.status || 'upcoming',
        brand_id: drop.brand_id || '',
        shop_id: drop.shop_id || '',
        affiliate_link: drop.affiliate_link || '',
        discount_code: drop.discount_code || '',
        is_featured: drop.is_featured || false,
        is_pro_exclusive: drop.is_pro_exclusive || false,
        product_images: drop.product_images || [],
      });
    } else {
      setFormData({
        title: '',
        slug: '',
        description: '',
        image_url: '',
        video_url: '',
        release_date: '',
        status: 'upcoming',
        brand_id: '',
        shop_id: '',
        affiliate_link: '',
        discount_code: '',
        is_featured: false,
        is_pro_exclusive: false,
        product_images: [],
      });
    }
  }, [drop]);

  useEffect(() => {
    if (open) {
      fetchBrandsAndShops();
    }
  }, [open]);

  const fetchBrandsAndShops = async () => {
    const [brandsRes, shopsRes] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('shops').select('*').order('name'),
    ]);

    if (brandsRes.data) setBrands(brandsRes.data);
    if (shopsRes.data) setShops(shopsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim() || !formData.slug.trim() || !formData.release_date) {
        toast({
          title: "Validation Error",
          description: "Title, slug, and release date are required",
          variant: "destructive",
        });
        return;
      }

      // Validate URLs if provided
      const urlFields = [
        { field: 'image_url', label: 'Image URL' },
        { field: 'video_url', label: 'Video URL' },
        { field: 'affiliate_link', label: 'Affiliate Link' },
      ];

      for (const { field, label } of urlFields) {
        const value = formData[field as keyof typeof formData] as string;
        if (value && value.trim()) {
          try {
            new URL(value);
          } catch {
            toast({
              title: "Invalid URL",
              description: `${label} must be a valid URL`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      const dropData = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        video_url: formData.video_url.trim() || null,
        release_date: new Date(formData.release_date).toISOString(),
        status: formData.status,
        brand_id: formData.brand_id || null,
        shop_id: formData.shop_id || null,
        affiliate_link: formData.affiliate_link.trim() || null,
        discount_code: formData.discount_code.trim() || null,
        is_featured: formData.is_featured,
        is_pro_exclusive: formData.is_pro_exclusive,
        product_images: formData.product_images.filter(url => url.trim()),
      };

      if (drop) {
        const { error } = await supabase
          .from('drops')
          .update(dropData)
          .eq('id', drop.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Drop updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('drops')
          .insert([dropData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Drop created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving drop:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save drop",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setFormData({ ...formData, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{drop ? 'Edit Drop' : 'Add New Drop'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
                <Button type="button" variant="outline" onClick={generateSlug}>
                  Generate
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="release_date">Release Date *</Label>
              <Input
                id="release_date"
                type="datetime-local"
                value={formData.release_date}
                onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'upcoming' | 'live' | 'ended') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select
                value={formData.brand_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, brand_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop">Shop</Label>
              <Select
                value={formData.shop_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, shop_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">Video URL</Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://example.com/video.mp4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="affiliate_link">Affiliate Link</Label>
              <Input
                id="affiliate_link"
                type="url"
                value={formData.affiliate_link}
                onChange={(e) => setFormData({ ...formData, affiliate_link: e.target.value })}
                placeholder="https://example.com/buy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_code">Discount Code</Label>
              <Input
                id="discount_code"
                value={formData.discount_code}
                onChange={(e) => setFormData({ ...formData, discount_code: e.target.value })}
                placeholder="SAVE20"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
              <Label htmlFor="is_featured">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_pro_exclusive"
                checked={formData.is_pro_exclusive}
                onCheckedChange={(checked) => setFormData({ ...formData, is_pro_exclusive: checked })}
              />
              <Label htmlFor="is_pro_exclusive">Pro Exclusive</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {drop ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
