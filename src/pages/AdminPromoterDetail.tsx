import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminPromoterDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [promoter, setPromoter] = useState<any>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: v }] = await Promise.all([
      supabase.from("promoters").select("*").eq("id", id).maybeSingle(),
      supabase.from("promoter_campaigns").select("*").eq("promoter_id", id).maybeSingle(),
      supabase.from("promoter_visits").select("*").eq("promoter_id", id).order("visited_at", { ascending: false }).limit(500),
    ]);
    setPromoter(p); setCampaign(c); setVisits(v || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, id]);

  const saveCampaign = async () => {
    if (!campaign) return;
    const { error } = await supabase.from("promoter_campaigns").update({
      target_visits: campaign.target_visits,
      target_signins: campaign.target_signins,
      rate_visit: campaign.rate_visit,
      rate_signin: campaign.rate_signin,
      rate_post_signin: campaign.rate_post_signin,
      daily_cap: campaign.daily_cap,
      end_date: campaign.end_date,
    }).eq("id", campaign.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); load(); }
  };

  const markPaid = async () => {
    await supabase.from("promoters").update({ paid_at: new Date().toISOString() }).eq("id", id);
    toast.success("Marked as paid");
    load();
  };

  if (adminLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#AD3A49]" /></div>
  );
  if (!isAdmin) { navigate("/more"); return null; }
  if (!promoter) return <div className="p-8">Promoter not found</div>;

  const validVisits = visits.filter(v => !v.duplicate);
  const qualified = validVisits.filter(v => v.qualified).length;
  const signins = validVisits.filter(v => v.signed_in).length;
  const campaignSignins = validVisits.filter(v => v.signed_in && !v.post_campaign && !v.capped).length;
  const postSignins = validVisits.filter(v => v.signed_in && v.post_campaign).length;
  const qualifiedPaid = validVisits.filter(v => v.qualified && !v.capped).length;

  const visitPay = qualifiedPaid * Number(campaign?.rate_visit || 0);
  const signinPay = campaignSignins * Number(campaign?.rate_signin || 0);
  const postPay = postSignins * Number(campaign?.rate_post_signin || 0);
  const total = visitPay + signinPay + postPay;

  return (
    <div className="min-h-screen bg-background lg:pt-14">
      <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/promoters")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{promoter.name} <span className="font-mono text-base text-muted-foreground">({promoter.code})</span></h1>
            <p className="text-sm text-muted-foreground">{promoter.city}</p>
          </div>
          {promoter.paid_at && <Badge variant="outline">Paid {format(new Date(promoter.paid_at), "PP")}</Badge>}
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Qualified visits" value={qualified} />
          <Stat label="Sign-ins" value={signins} />
          <Stat label="Campaign payout" value={`£${Number(campaign?.total_payout || 0).toFixed(2)}`} />
          <Stat label="Conversion" value={qualified ? `${((signins / qualified) * 100).toFixed(1)}%` : "0%"} />
        </div>

        <Card>
          <CardHeader><CardTitle>Payout breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={`Qualified visits × £${campaign?.rate_visit}`} value={`${qualifiedPaid} × £${campaign?.rate_visit} = £${visitPay.toFixed(2)}`} />
            <Row label={`Campaign sign-ins × £${campaign?.rate_signin}`} value={`${campaignSignins} × £${campaign?.rate_signin} = £${signinPay.toFixed(2)}`} />
            <Row label={`Post-campaign sign-ins × £${campaign?.rate_post_signin}`} value={`${postSignins} × £${campaign?.rate_post_signin} = £${postPay.toFixed(2)}`} />
            <div className="pt-2 mt-2 border-t flex justify-between font-bold text-lg">
              <span>TOTAL OWED</span><span className="text-[#AD3A49]">£{total.toFixed(2)}</span>
            </div>
            <Button onClick={markPaid} className="mt-3 bg-[#AD3A49] hover:bg-[#AD3A49]/90">Mark as Paid</Button>
          </CardContent>
        </Card>

        {campaign && (
          <Card>
            <CardHeader><CardTitle>Campaign settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Target visits" type="number" value={campaign.target_visits} onChange={v => setCampaign({ ...campaign, target_visits: Number(v) })} />
              <Field label="Target sign-ins" type="number" value={campaign.target_signins} onChange={v => setCampaign({ ...campaign, target_signins: Number(v) })} />
              <Field label="Rate per visit (£)" type="number" value={campaign.rate_visit} onChange={v => setCampaign({ ...campaign, rate_visit: Number(v) })} step="0.01" />
              <Field label="Rate per sign-in (£)" type="number" value={campaign.rate_signin} onChange={v => setCampaign({ ...campaign, rate_signin: Number(v) })} step="0.01" />
              <Field label="Rate post-campaign sign-in (£)" type="number" value={campaign.rate_post_signin} onChange={v => setCampaign({ ...campaign, rate_post_signin: Number(v) })} step="0.01" />
              <Field label="Daily cap (£)" type="number" value={campaign.daily_cap} onChange={v => setCampaign({ ...campaign, daily_cap: Number(v) })} step="0.01" />
              <Field label="End date" type="date" value={campaign.end_date || ""} onChange={v => setCampaign({ ...campaign, end_date: v })} />
              <div className="flex items-end"><Button onClick={saveCampaign}>Save changes</Button></div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Visit log ({visits.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>Qualified</TableHead><TableHead>Signed in</TableHead>
                  <TableHead>Post-campaign</TableHead><TableHead>Capped</TableHead><TableHead>Duplicate</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {visits.slice(0, 100).map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{format(new Date(v.visited_at), "MMM d, HH:mm")}</TableCell>
                      <TableCell>{v.qualified ? "Yes" : "No"}</TableCell>
                      <TableCell>{v.signed_in ? "Yes" : "No"}</TableCell>
                      <TableCell>{v.post_campaign ? "Yes" : "—"}</TableCell>
                      <TableCell>{v.capped ? <Badge variant="destructive">Capped</Badge> : "—"}</TableCell>
                      <TableCell>{v.duplicate ? <Badge variant="secondary">Dup</Badge> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-mono">{value}</span></div>;
}
function Field({ label, value, onChange, type = "text", step }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} step={step} value={value ?? ""} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
