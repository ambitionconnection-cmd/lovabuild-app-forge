import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap, Route, Heart, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ProUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: string;
}

const PRO_FEATURES = [
  { icon: Route, label: "Unlimited saved routes" },
  { icon: Heart, label: "Unlimited favourites" },
  { icon: FileText, label: "Print/PDF route export" },
  { icon: Crown, label: "Pro badge on your profile" },
  { icon: Zap, label: "Boosted visibility on Hot posts" },
];

export const ProUpgradeModal = ({ open, onOpenChange, trigger }: ProUpgradeModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    if (!user) {
      onOpenChange(false);
      navigate("/auth");
      toast.info("Sign in to upgrade to Pro");
      return;
    }

    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Failed to start checkout. Please try again.");
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-[#c48e19]/30 bg-card">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-[#c48e19]/20 flex items-center justify-center">
            <Crown className="w-6 h-6 text-[#c48e19]" />
          </div>
          <DialogTitle className="text-xl font-bold uppercase tracking-wide">
            Upgrade to FLYAF Pro
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {trigger === "routes"
              ? "You've reached the free limit of 2 saved routes."
              : trigger === "favourites"
              ? "You've reached the free limit of 8 favourites."
              : trigger === "pdf"
              ? "PDF export is a Pro feature."
              : "Unlock the full FLYAF experience."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {PRO_FEATURES.map((feat) => (
            <div key={feat.label} className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-[#c48e19]/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-[#c48e19]" />
              </div>
              <span>{feat.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Monthly */}
          <button
            onClick={() => handleCheckout("monthly")}
            disabled={loading !== null}
            className="relative flex flex-col items-center p-4 rounded-xl border border-border hover:border-[#c48e19]/50 transition-all bg-muted/30"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly</span>
            <span className="text-2xl font-bold text-foreground">£2.99</span>
            <span className="text-xs text-muted-foreground">/month</span>
            {loading === "monthly" && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
          </button>

          {/* Yearly */}
          <button
            onClick={() => handleCheckout("yearly")}
            disabled={loading !== null}
            className="relative flex flex-col items-center p-4 rounded-xl border-2 border-[#c48e19]/50 hover:border-[#c48e19] transition-all bg-[#c48e19]/5"
          >
            <Badge className="absolute -top-2.5 bg-[#c48e19] text-black text-[10px] px-2 py-0.5 font-bold">
              SAVE 44%
            </Badge>
            <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Yearly</span>
            <span className="text-2xl font-bold text-foreground">£19.99</span>
            <span className="text-xs text-muted-foreground">/year</span>
            {loading === "yearly" && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
          </button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground mt-2">
          Cancel anytime. Subscription managed via Stripe.
        </p>
      </DialogContent>
    </Dialog>
  );
};
