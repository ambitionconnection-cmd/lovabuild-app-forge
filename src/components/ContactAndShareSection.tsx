import { Share2, MessageSquare, Facebook, Twitter, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const ContactAndShareSection = () => {
  const navigate = useNavigate();

  const handleShare = (platform: string) => {
    const url = window.location.origin;
    const text = "Check out HEARDROP - Your Global Guide to Streetwear!";
    
    let shareUrl = "";
    
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  return (
    <section className="py-6 sm:py-12 border-t border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {/* Contact Us */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 hover:scale-[1.02] transition-transform touch-manipulation active:scale-[0.98]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/20">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Get in Touch</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Got something to tell us? Report an issue, suggest a brand, or partner with us.
                </p>
                <Button onClick={() => navigate("/contact")} className="w-full md:w-auto min-h-[44px] touch-manipulation active:scale-95">
                  Contact Us
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share App */}
        <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20 hover:scale-[1.02] transition-transform touch-manipulation active:scale-[0.98]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-accent/20">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Share HEARDROP</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Spread the word about your favorite streetwear guide!
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="min-h-[40px] touch-manipulation active:scale-95"
                    onClick={() => handleShare("facebook")}
                  >
                    <Facebook className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Facebook</span>
                    <span className="sm:hidden">FB</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="min-h-[40px] touch-manipulation active:scale-95"
                    onClick={() => handleShare("twitter")}
                  >
                    <Twitter className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Twitter</span>
                    <span className="sm:hidden">X</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="min-h-[40px] touch-manipulation active:scale-95"
                    onClick={() => handleShare("copy")}
                  >
                    <Link2 className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Copy Link</span>
                    <span className="sm:hidden">Copy</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
