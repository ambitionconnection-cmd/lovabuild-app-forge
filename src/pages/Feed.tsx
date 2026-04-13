import { ArrowLeft, Flame } from "lucide-react";
import urbanBg from "@/assets/urban-bg.jpg";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StreetSpottedFeed } from "@/components/StreetSpottedFeed";
import { usePageTracking } from "@/hooks/usePageTracking";
import { trackEvent } from "@/lib/analytics";

const Feed = () => {
  usePageTracking('hot');
  trackEvent('hot_opened');
  return (
    <div className="relative min-h-screen bg-background pb-20 pt-0 lg:pt-14 animate-fade-in">
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${urbanBg})` }} />
      <div className="fixed inset-0 bg-background/80" />
      {/* Header */}
      <header className="relative sticky top-0 lg:top-14 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:scale-110 active:scale-95 transition-transform">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h1 className="text-base font-bold uppercase tracking-wider">Hot</h1>
          </div>
        </div>
      </header>

      {/* Street Spotted Feed */}
      <div className="relative mt-0 pt-3">
        <StreetSpottedFeed />
      </div>
    </div>
  );
};

export default Feed;
