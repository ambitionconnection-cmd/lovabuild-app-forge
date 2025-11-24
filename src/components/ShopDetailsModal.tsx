import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tables } from "@/integrations/supabase/types";
import { MapPin, Phone, Mail, ExternalLink, Clock, Navigation } from "lucide-react";

interface ShopDetailsModalProps {
  shop: Tables<'shops_public'> | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToJourney?: (shop: Tables<'shops_public'>) => void;
  onGetDirections?: (shop: Tables<'shops_public'>) => void;
  isInJourney?: boolean;
}

export const ShopDetailsModal = ({
  shop,
  isOpen,
  onClose,
  onAddToJourney,
  onGetDirections,
  isInJourney = false,
}: ShopDetailsModalProps) => {
  if (!shop) return null;

  const openingHours = shop.opening_hours as Record<string, string> | null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{shop.name}</DialogTitle>
        </DialogHeader>

        {/* Image */}
        {shop.image_url && (
          <div className="relative h-64 w-full rounded-lg overflow-hidden bg-muted">
            <img
              src={shop.image_url}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Category Badge */}
        {shop.category && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {shop.category}
            </Badge>
            {shop.is_unique_shop && (
              <Badge variant="outline" className="border-primary text-primary">
                Unique Shop
              </Badge>
            )}
          </div>
        )}

        {/* Description */}
        {shop.description && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">About</h3>
            <p className="text-muted-foreground">{shop.description}</p>
          </div>
        )}

        <Separator />

        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Contact Information</h3>
          
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {shop.address}, {shop.city}, {shop.country}
                </p>
              </div>
            </div>

            {shop.official_site && (
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Website</p>
                  <a
                    href={shop.official_site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {shop.official_site}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Opening Hours */}
        {openingHours && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Opening Hours
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(openingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between py-1">
                    <span className="capitalize font-medium text-muted-foreground">{day}</span>
                    <span>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {onAddToJourney && !isInJourney && (
            <Button
              className="flex-1 bg-directions hover:bg-directions/90 text-directions-foreground"
              onClick={() => {
                onAddToJourney(shop);
                onClose();
              }}
              disabled={!shop.latitude || !shop.longitude}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Add to Journey
            </Button>
          )}
          {onGetDirections && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onGetDirections(shop);
                onClose();
              }}
              disabled={!shop.latitude || !shop.longitude}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
