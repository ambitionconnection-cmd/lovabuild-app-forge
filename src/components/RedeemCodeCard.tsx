import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Gift, Loader2, Check } from "lucide-react";

export function RedeemCodeCard() {
  const { user, checkSubscription } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const handleRedeem = async () => {
    if (!user || !code.trim()) return;

    setLoading(true);
    try {
      // Look up the code
      const { data: codeData, error: codeError } = await supabase
        .from("ambassador_codes")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (codeError || !codeData) {
        toast.error("Invalid or expired code");
        setLoading(false);
        return;
      }

      // Type assertion for the code data
      const ambassadorCode = codeData as any;

      if (ambassadorCode.uses_count >= ambassadorCode.max_uses) {
        toast.error("This code has already been fully redeemed");
        setLoading(false);
        return;
      }

      // Check if user already redeemed this code
      const { data: existing } = await supabase
        .from("code_redemptions")
        .select("id")
        .eq("code_id", ambassadorCode.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("You've already redeemed this code");
        setLoading(false);
        return;
      }

      // Record redemption
      const { error: redemptionError } = await supabase
        .from("code_redemptions")
        .insert({ code_id: ambassadorCode.id, user_id: user.id } as any);

      if (redemptionError) {
        console.error(redemptionError);
        toast.error("Failed to redeem code");
        setLoading(false);
        return;
      }

      // Increment uses_count
      await supabase
        .from("ambassador_codes")
        .update({ uses_count: ambassadorCode.uses_count + 1 } as any)
        .eq("id", ambassadorCode.id);

      // Grant Pro access
      const proExpiresAt = ambassadorCode.pro_duration_days
        ? new Date(Date.now() + ambassadorCode.pro_duration_days * 86400000).toISOString()
        : null; // null = permanent

      await supabase
        .from("profiles")
        .update({
          is_pro: true,
          pro_expires_at: proExpiresAt,
        })
        .eq("id", user.id);

      setRedeemed(true);
      toast.success(
        ambassadorCode.pro_duration_days
          ? `Welcome! You've got FLYAF Pro for ${ambassadorCode.pro_duration_days} days 🎉`
          : "Welcome! You've got permanent FLYAF Pro access 🎉"
      );

      // Refresh subscription state
      await checkSubscription();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (redeemed) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-500">
            <Check className="w-5 h-5" />
            <span className="font-medium">Code redeemed — you're now FLYAF Pro!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          Have an invite code?
        </CardTitle>
        <CardDescription className="text-xs">
          Enter your ambassador code to unlock FLYAF Pro
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="FLYAF-XXXXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono"
            disabled={loading}
          />
          <Button onClick={handleRedeem} disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
