import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ExternalLink, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface ShopListModalProps {
  brandId: string;
  brandName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  official_site: string | null;
}

export default function ShopListModal({ brandId, brandName, isOpen, onClose }: ShopListModalProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && brandId) {
      fetchShops();
    }
  }, [isOpen, brandId]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, address, city, country, latitude, longitude, official_site")
        .eq("brand_id", brandId)
        .eq("is_active", true)
        .order("country", { ascending: true })
        .order("city", { ascending: true });

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOnMap = (shop: Shop) => {
    if (shop.latitude && shop.longitude) {
      const params = new URLSearchParams({
        shopId: shop.id,
        lat: shop.latitude.toString(),
        lng: shop.longitude.toString(),
        zoom: "15"
      });
      navigate(`/directions?${params.toString()}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{brandName} - Shop Locations</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No physical stores found for this brand.</p>
            <p className="text-sm mt-2">This brand may be online-only or stores data is not yet available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shops.map((shop) => (
              <Card key={shop.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{shop.name}</h3>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{shop.address}</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {shop.city}, {shop.country}
                      </p>
                      {shop.official_site && (
                        <a
                          href={shop.official_site}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2 ml-6"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Visit Website
                        </a>
                      )}
                    </div>
                    
                    {shop.latitude && shop.longitude && (
                      <Button
                        onClick={() => handleViewOnMap(shop)}
                        size="sm"
                        className="flex-shrink-0"
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        View on Map
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
