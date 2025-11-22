import { MapPin, Globe, Zap, Heart, Search, Settings, LogOut, User } from "lucide-react";
import { NavBlock } from "@/components/NavBlock";
import { Button } from "@/components/ui/button";

const Index = () => {
  // Mock notification count - will be replaced with real data
  const notificationCount = 3;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-directions via-drops to-heardrop" />
            <h1 className="text-2xl font-bold tracking-tight">HEARDROP</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative h-[200px] overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=2000')] bg-cover bg-center opacity-30" />
        <div className="relative h-full flex items-center justify-center">
          <h2 className="text-4xl md:text-6xl font-bold text-center text-foreground tracking-wider">
            STREETWEAR HUB
          </h2>
        </div>
      </div>

      {/* Main Navigation Grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <NavBlock
            title="Directions"
            icon={MapPin}
            to="/directions"
            variant="directions"
          />
          
          <NavBlock
            title="Global Index"
            icon={Globe}
            to="/global-index"
            variant="global"
          />
          
          <NavBlock
            title="Drops"
            icon={Zap}
            to="/drops"
            variant="drops"
          />
          
          <NavBlock
            title="My Heardrop"
            icon={Heart}
            to="/my-heardrop"
            badge={notificationCount}
            variant="heardrop"
          />
        </div>

        {/* Quick Info */}
        <div className="mt-12 text-center text-muted-foreground text-sm max-w-2xl mx-auto">
          <p>Discover the latest streetwear drops, find nearby shops, and stay connected with your favorite brands.</p>
        </div>
      </main>
    </div>
  );
};

export default Index;
