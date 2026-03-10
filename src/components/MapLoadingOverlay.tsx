import { Loader2, MapPin } from "lucide-react";

interface MapLoadingOverlayProps {
  isLoading: boolean;
  shopsCount?: number;
  message?: string;
  minimal?: boolean;
}

const MapLoadingOverlay = ({ isLoading, shopsCount, message, minimal = false }: MapLoadingOverlayProps) => {
  if (!isLoading) return null;

  if (minimal) {
    return (
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/90 border border-border shadow-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Updating map…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/90 border border-border shadow-lg">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <MapPin className="h-8 w-8 text-primary/30" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {message || "Loading map..."}
          </p>
          {shopsCount !== undefined && shopsCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Placing {shopsCount} shop{shopsCount !== 1 ? 's' : ''} on map
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapLoadingOverlay;
