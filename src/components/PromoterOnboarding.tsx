import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Loader2, Rocket, X, ChevronRight } from "lucide-react";

const LS_KEY = "flyaf_promoter_onboarding";

type State = {
  dismissed?: boolean;
  completed?: boolean;
  promoterId?: string;
  promoterCode?: string;
  copied?: boolean;
  tested?: boolean;
};

const readState = (): State => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
};
const writeState = (s: State) => localStorage.setItem(LS_KEY, JSON.stringify(s));

interface Props {
  promoterCount: number;
  onCreated: () => void;
}

export default function PromoterOnboarding({ promoterCount, onCreated }: Props) {
  const [state, setState] = useState<State>(() => readState());
  const [form, setForm] = useState({ name: "", code: "", city: "London" });
  const [submitting, setSubmitting] = useState(false);

  // Auto-link to existing promoter if user has at least one and onboarding never ran
  useEffect(() => {
    if (!state.promoterId && promoterCount > 0 && !state.dismissed) {
      // Treat as completed silently — they already have promoters
      const next = { ...state, completed: true };
      setState(next); writeState(next);
    }
  }, [promoterCount]); // eslint-disable-line

  const update = (patch: Partial<State>) => {
    const next = { ...state, ...patch };
    setState(next); writeState(next);
  };

  const refUrl = useMemo(
    () => state.promoterCode ? `${window.location.origin}/ref/${state.promoterCode}` : "",
    [state.promoterCode]
  );

  const currentStep = !state.promoterId ? 1 : !state.copied ? 2 : !state.tested ? 3 : 4;
  const progress = ((currentStep - 1) / 3) * 100;

  if (state.dismissed || state.completed) return null;

  const createPromoter = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.city.trim()) {
      toast.error("Fill in name, code, and city"); return;
    }
    setSubmitting(true);
    const code = form.code.toUpperCase().replace(/\s+/g, "");
    const { data: pr, error } = await supabase
      .from("promoters")
      .insert({ name: form.name.trim(), code, city: form.city.trim() })
      .select().single();
    if (error || !pr) {
      toast.error(error?.message || "Could not create promoter");
      setSubmitting(false); return;
    }
    await supabase.from("promoter_campaigns").insert({ promoter_id: pr.id, city: form.city.trim() });
    update({ promoterId: pr.id, promoterCode: pr.code });
    toast.success(`Promoter ${pr.code} created`);
    setSubmitting(false);
    onCreated();
  };

  const copyLink = async () => {
    if (!refUrl) return;
    await navigator.clipboard.writeText(refUrl);
    update({ copied: true });
    toast.success("Referral link copied");
  };

  const testLink = () => {
    if (!refUrl) return;
    window.open(refUrl, "_blank", "noopener,noreferrer");
    update({ tested: true });
  };

  const finish = () => update({ completed: true });
  const dismiss = () => {
    if (confirm("Hide the setup guide? You can clear localStorage to bring it back.")) {
      update({ dismissed: true });
    }
  };

  return (
    <Card className="mb-6 border-[#AD3A49]/40 bg-gradient-to-br from-[#AD3A49]/5 to-background">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#AD3A49] text-white flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Launch your first street promoter</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              3 quick steps to get a tracked referral link live.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {Math.min(currentStep, 3)} of 3</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* STEP 1 — Create */}
        <Step
          n={1}
          title="Create a promoter"
          done={!!state.promoterId}
          active={currentStep === 1}
        >
          <p className="text-sm text-muted-foreground mb-3">
            Give them a name, a short uppercase code (e.g. <code className="font-mono">JAY01</code>), and the city they'll work.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jay" />
            </div>
            <div>
              <Label className="text-xs">Code</Label>
              <Input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="JAY01"
                className="font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="London" />
            </div>
          </div>
          <Button
            onClick={createPromoter}
            disabled={submitting}
            className="mt-4 bg-[#AD3A49] hover:bg-[#AD3A49]/90 text-white"
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-2" />}
            Create promoter
          </Button>
        </Step>

        {/* STEP 2 — Copy link */}
        <Step
          n={2}
          title="Copy the referral link"
          done={!!state.copied}
          active={currentStep === 2}
        >
          <p className="text-sm text-muted-foreground mb-3">
            This is the link your promoter shares. Every visit is tracked and attributed to{" "}
            <span className="font-mono font-semibold">{state.promoterCode}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={refUrl} className="font-mono text-xs" />
            <Button onClick={copyLink} variant="outline" className="shrink-0">
              <Copy className="h-4 w-4 mr-2" /> Copy link
            </Button>
          </div>
        </Step>

        {/* STEP 3 — Test */}
        <Step
          n={3}
          title="Test the live /ref redirect"
          done={!!state.tested}
          active={currentStep === 3}
        >
          <p className="text-sm text-muted-foreground mb-3">
            Open the link in a new tab. You should see the promoter landing page with your city headline.
            A visit will appear in the table within seconds.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={testLink} className="bg-[#AD3A49] hover:bg-[#AD3A49]/90 text-white">
              <ExternalLink className="h-4 w-4 mr-2" /> Open /ref/{state.promoterCode}
            </Button>
            {state.tested && (
              <Button onClick={finish} variant="outline">
                <Check className="h-4 w-4 mr-2" /> All done
              </Button>
            )}
          </div>
        </Step>
      </CardContent>
    </Card>
  );
}

function Step({
  n, title, done, active, children,
}: { n: number; title: string; done: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 transition-all ${
      done ? "bg-muted/30 border-border" : active ? "border-[#AD3A49]/40 bg-background shadow-sm" : "opacity-60 border-border"
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
          done ? "bg-[#4ECDC4] text-white" : active ? "bg-[#AD3A49] text-white" : "bg-muted text-muted-foreground"
        }`}>
          {done ? <Check className="h-4 w-4" /> : n}
        </div>
        <h3 className="font-semibold text-sm flex-1">{title}</h3>
        {done && <Badge variant="outline" className="text-[#4ECDC4] border-[#4ECDC4]/40">Done</Badge>}
      </div>
      {active && <div className="pl-10">{children}</div>}
    </div>
  );
}
