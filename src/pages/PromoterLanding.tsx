import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Route, Globe } from "lucide-react";
import flyafLogo from "@/assets/flyaf-logo.svg";
import {
  recordPromoterVisit,
  qualifyPromoterVisit,
  beaconQualify,
  creditPromoterSignin,
} from "@/lib/promoterTracking";
import { supabase } from "@/integrations/supabase/client";

export default function PromoterLanding() {
  const { code = "" } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [promoterCity, setPromoterCity] = useState<string>("the city");
  const landedAtRef = useRef<number>(Date.now());
  const qualifiedSentRef = useRef(false);

  // Lookup promoter city for headline
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("promoters").select("city, active").ilike("code", code).maybeSingle();
      if (data?.city) setPromoterCity(data.city);
    })();
  }, [code]);

  // Record visit on mount + start qualification timer
  useEffect(() => {
    landedAtRef.current = Date.now();
    recordPromoterVisit(code);

    // Auto-credit if user is already signed in
    if (user) {
      creditPromoterSignin(user.id).then(() => {
        navigate("/", { replace: true });
      });
      return;
    }

    // 30s qualification timer
    const t = setTimeout(() => {
      if (!qualifiedSentRef.current) {
        qualifiedSentRef.current = true;
        qualifyPromoterVisit(code, 30000);
      }
    }, 30000);

    // Beacon on unload with actual elapsed time
    const onUnload = () => {
      const elapsed = Date.now() - landedAtRef.current;
      if (elapsed >= 30000 && !qualifiedSentRef.current) {
        qualifiedSentRef.current = true;
        beaconQualify(code, elapsed);
      } else if (elapsed >= 30000) {
        beaconQualify(code, elapsed);
      }
    };
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearTimeout(t);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // If user signs in later in this session, credit them then redirect
  useEffect(() => {
    if (user) {
      creditPromoterSignin(user.id).then(() => {
        navigate("/", { replace: true });
      });
    }
  }, [user, navigate]);

  const goSignUp = () => navigate(`/auth?tab=signup&ref=${encodeURIComponent(code)}`);
  const goSignIn = () => navigate(`/auth?tab=signin&ref=${encodeURIComponent(code)}`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* TOP — above the fold */}
      <section className="min-h-screen flex flex-col px-6 py-10 max-w-2xl mx-auto">
        <div className="flex justify-center pt-2">
          <img src={flyafLogo} alt="FLYAF" className="h-10 w-auto" />
        </div>

        <div className="flex-1 flex flex-col justify-center py-10">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
            You're in {promoterCity}.<br />
            <span className="text-muted-foreground">This is your map.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Every streetwear shop in {promoterCity} — on one map. Free to use.
          </p>

          <Card className="mt-8 p-6 bg-[#AD3A49] text-white border-none shadow-2xl">
            <h2 className="text-2xl font-bold leading-tight">
              First 500 members get Pro free — 3 months.
            </h2>
            <p className="mt-2 text-white/90">
              That's unlimited routes, no ads, and early access to new cities. Yours free when you sign up.
            </p>
            <Button
              onClick={goSignUp}
              className="mt-5 w-full h-12 text-base font-semibold bg-white text-[#AD3A49] hover:bg-white/90"
            >
              Sign Up Free
            </Button>
            <button
              onClick={goSignIn}
              className="mt-3 w-full text-sm text-white/80 hover:text-white underline-offset-4 hover:underline"
            >
              Already have an account? Sign in
            </button>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground pb-2">
          Scroll for more ↓
        </div>
      </section>

      {/* BOTTOM — features */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-6">
          <Feature icon={<MapPin className="h-6 w-6" />} title="200+ shops mapped" />
          <Feature icon={<Route className="h-6 w-6" />} title="Build your route in seconds" />
          <Feature icon={<Globe className="h-6 w-6" />} title="Available in 6 languages" />
        </div>

        <div className="mt-12 rounded-xl overflow-hidden border bg-muted/30 aspect-video flex items-center justify-center">
          <p className="text-sm text-muted-foreground px-4 text-center">
            Map preview — Soho pins
          </p>
        </div>

        <div className="mt-12 text-center">
          <Button
            onClick={goSignUp}
            size="lg"
            className="bg-[#AD3A49] hover:bg-[#AD3A49]/90 text-white h-12 px-8 text-base font-semibold"
          >
            Sign Up Free
          </Button>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 p-4">
      <div className="h-12 w-12 rounded-full bg-[#AD3A49]/10 text-[#AD3A49] flex items-center justify-center">
        {icon}
      </div>
      <div className="font-semibold text-sm">{title}</div>
    </div>
  );
}
