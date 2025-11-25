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
    <section className="py-12 border-t border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Us */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 hover:scale-[1.02] transition-transform">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Get in Touch</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Got something to tell us? Report an issue, suggest a brand, or partner with us.
                </p>
                <Button onClick={() => navigate("/contact")} className="w-full md:w-auto">
                  Contact Us
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share App */}
        <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20 hover:scale-[1.02] transition-transform">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-accent/20">
                <Share2 className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Share HEARDROP</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Spread the word about your favorite streetwear guide!
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare("facebook")}
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare("twitter")}
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare("copy")}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Copy Link
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
