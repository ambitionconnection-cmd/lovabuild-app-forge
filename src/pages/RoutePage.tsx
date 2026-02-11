import { MapPin, Save, Printer, Share2, Trash2, Navigation, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const RoutePage = () => {
  const navigate = useNavigate();

  // Journey stops are stored in Directions.tsx state
  // For now, this page shows instructions and action buttons
  // In Phase 3, this will load saved routes from Supabase

  const handleSave = () => {
    toast({
      title: "Coming Soon",
      description: "Save route feature will be available in the next update.",
    });
  };

  const handlePrint = () => {
    toast({
      title: "Coming Soon",
      description: "PDF export will be available in the next update.",
    });
  };

  const handleShare = () => {
    toast({
      title: "Coming Soon",
      description: "Share route link will be available in the next update.",
    });
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 lg:pt-16">
        <h1 className="text-2xl font-bold text-white tracking-wider uppercase">Route</h1>
        <p className="text-sm text-white/40 mt-1">Plan your streetwear shopping trip</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Quick actions */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Current route status */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Navigation className="w-7 h-7 text-white/30" />
          </div>
          <h3 className="text-white font-semibold text-sm mb-2">Build Your Route</h3>
          <p className="text-white/40 text-xs leading-relaxed mb-4">
            Go to the Map, tap shops and add them to your journey. Your route will appear here with directions, distances and estimated walking time.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-white/10 hover:bg-white/15 text-white border border-white/10"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Open Map
          </Button>
        </div>

        {/* Saved routes section - placeholder for Phase 3 */}
        <div className="mt-8">
          <h3 className="text-white/50 text-xs uppercase tracking-wider mb-3">Saved Routes</h3>
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-white/30 text-xs">
              Your saved routes will appear here. Save a route from the map to access it anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePage;