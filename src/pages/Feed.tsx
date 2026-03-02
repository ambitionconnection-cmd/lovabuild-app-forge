import { ArrowLeft, Newspaper, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandRadarFeed } from "@/components/BrandRadarFeed";
import { StreetSpottedFeed } from "@/components/StreetSpottedFeed";

const Feed = () => {
  return (
    <div className="min-h-screen bg-background pb-20 pt-0 lg:pt-14 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 lg:top-14 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-3 py-2 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:scale-110 active:scale-95 transition-transform">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold uppercase tracking-wider">Feed</h1>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="spotted" className="w-full">
        <div className="sticky top-[49px] lg:top-[105px] z-30 bg-background/95 backdrop-blur-sm border-b border-border/30 px-3 pt-2">
          <TabsList className="w-full grid grid-cols-2 h-10">
            <TabsTrigger value="spotted" className="gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Camera className="w-4 h-4" />
              Street Spotted
            </TabsTrigger>
            <TabsTrigger value="radar" className="gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Newspaper className="w-4 h-4" />
              Brand Radar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="spotted" className="mt-0 pt-3">
          <StreetSpottedFeed />
        </TabsContent>

        <TabsContent value="radar" className="mt-0 pt-3">
          <BrandRadarFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Feed;
