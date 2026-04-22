import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import flyafLogo from "@/assets/flyaf-logo.svg";

interface Results {
  promoter_name: string;
  city: string;
  qualified_visits: number;
  signins: number;
  target_visits: number;
  target_signins: number;
  earnings_today: number;
  earnings_total: number;
  conversion_rate: number;
}

export default function PromoterResults() {
  const { code = "" } = useParams<{ code: string }>();
  const [data, setData] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: rows, error } = await supabase.rpc("get_promoter_results", { _code: code });
      if (cancelled) return;
      if (error || !rows || rows.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const r = rows[0] as any;
      setData({
        promoter_name: r.promoter_name,
        city: r.city,
        qualified_visits: Number(r.qualified_visits || 0),
        signins: Number(r.signins || 0),
        target_visits: Number(r.target_visits || 0),
        target_signins: Number(r.target_signins || 0),
        earnings_today: Number(r.earnings_today || 0),
        earnings_total: Number(r.earnings_total || 0),
        conversion_rate: Number(r.conversion_rate || 0),
      });
      setLoading(false);
    };
    load();
    const i = setInterval(load, 60_000); // refresh every 60s
    return () => { cancelled = true; clearInterval(i); };
  }, [code]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#AD3A49]" />
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Promoter not found.
    </div>
  );

  const firstName = data.promoter_name.split(" ")[0];
  const visitPct = Math.min(100, (data.qualified_visits / Math.max(1, data.target_visits)) * 100);
  const signinPct = Math.min(100, (data.signins / Math.max(1, data.target_signins)) * 100);

  let motivation = "Focus on sign-ins — lead with the free Pro offer.";
  if (data.conversion_rate >= 30) motivation = "Excellent conversion. Keep going.";
  else if (data.conversion_rate >= 15) motivation = "Good pace. Push the sign-ups.";

  return (
    <div className="min-h-screen bg-background px-4 py-8 lg:pt-20">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex justify-center">
          <img src={flyafLogo} alt="FLYAF" className="h-8 w-auto" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold">{firstName}</h1>
          <p className="text-muted-foreground">{data.city}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Qualified visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span>{data.qualified_visits}</span>
              <span className="text-muted-foreground">/ {data.target_visits}</span>
            </div>
            <Progress value={visitPct} className="h-3 [&>div]:bg-[#AD3A49]" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign-ins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span>{data.signins}</span>
              <span className="text-muted-foreground">/ {data.target_signins}</span>
            </div>
            <Progress value={signinPct} className="h-3 [&>div]:bg-[#AD3A49]" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm text-muted-foreground">Conversion rate</div>
            <div className="text-4xl font-bold text-[#AD3A49] mt-1">{data.conversion_rate}%</div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Today</div>
              <div className="text-2xl font-bold mt-1">£{data.earnings_today.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Campaign total</div>
              <div className="text-2xl font-bold mt-1">£{data.earnings_total.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#AD3A49]/10 border-[#AD3A49]/30">
          <CardContent className="pt-6 text-center">
            <p className="font-semibold text-[#AD3A49]">{motivation}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
