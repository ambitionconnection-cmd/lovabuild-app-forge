import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, ExternalLink, Copy } from "lucide-react";

interface PromoterRow {
  id: string;
  name: string;
  code: string;
  city: string;
  active: boolean;
  campaign?: any;
  visits_today: number;
  visits_total: number;
  signins_today: number;
  signins_total: number;
  earnings_today: number;
  earnings_total: number;
  cap_reached: boolean;
}

export default function AdminPromoters() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [rows, setRows] = useState<PromoterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", city: "" });

  const load = async () => {
    setLoading(true);
    const { data: promoters } = await supabase.from("promoters").select("*").order("created_at", { ascending: false });
    if (!promoters) { setLoading(false); return; }
    const { data: campaigns } = await supabase.from("promoter_campaigns").select("*");
    const { data: visits } = await supabase.from("promoter_visits").select("*");

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

    const out: PromoterRow[] = promoters.map((p: any) => {
      const camp = campaigns?.find((c: any) => c.promoter_id === p.id);
      const vAll = visits?.filter((v: any) => v.promoter_id === p.id && !v.duplicate) || [];
      const vToday = vAll.filter((v: any) => new Date(v.visited_at) >= startOfDay);

      const earningsFor = (arr: any[]) => arr.reduce((sum, v) => {
        if (!camp) return sum;
        let e = 0;
        if (v.qualified && !v.capped) e += Number(camp.rate_visit);
        if (v.signed_in && !v.post_campaign && !v.capped) e += Number(camp.rate_signin);
        if (v.signed_in && v.post_campaign) e += Number(camp.rate_post_signin);
        return sum + e;
      }, 0);

      const earnings_today = earningsFor(vToday);
      const earnings_total = camp ? Number(camp.total_payout) : 0;

      return {
        id: p.id, name: p.name, code: p.code, city: p.city, active: p.active,
        campaign: camp,
        visits_today: vToday.filter((v: any) => v.qualified).length,
        visits_total: vAll.filter((v: any) => v.qualified).length,
        signins_today: vToday.filter((v: any) => v.signed_in).length,
        signins_total: vAll.filter((v: any) => v.signed_in).length,
        earnings_today,
        earnings_total,
        cap_reached: camp ? earnings_today >= Number(camp.daily_cap) : false,
      };
    });
    setRows(out);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const createPromoter = async () => {
    if (!form.name || !form.code || !form.city) { toast.error("All fields required"); return; }
    const { data: pr, error } = await supabase.from("promoters")
      .insert({ name: form.name, code: form.code.toUpperCase(), city: form.city })
      .select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("promoter_campaigns").insert({ promoter_id: pr.id, city: form.city });
    toast.success("Promoter created");
    setCreateOpen(false); setForm({ name: "", code: "", city: "" });
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("promoters").update({ active: !active }).eq("id", id);
    load();
  };

  const completeCampaign = async (promoterId: string) => {
    await supabase.from("promoter_campaigns")
      .update({ status: "completed", end_date: new Date().toISOString().slice(0, 10) })
      .eq("promoter_id", promoterId);
    toast.success("Campaign marked complete");
    load();
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/ref/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Referral link copied");
  };

  if (adminLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#AD3A49]" />
    </div>
  );
  if (!isAdmin) { navigate("/more"); return null; }

  return (
    <div className="min-h-screen bg-background lg:pt-14">
      <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Street Promoters</h1>
            <p className="text-sm text-muted-foreground">Track campaign performance and payouts</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New promoter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create promoter</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Code (e.g. JAY01)</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={createPromoter}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-6">
        <Card>
          <CardHeader><CardTitle>All promoters</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No promoters yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promoter</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Visits (today/total)</TableHead>
                      <TableHead>Sign-ins (today/total)</TableHead>
                      <TableHead>Conversion</TableHead>
                      <TableHead>Payout (today/total)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => {
                      const conv = r.visits_total > 0 ? ((r.signins_total / r.visits_total) * 100).toFixed(1) : "0";
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-semibold">{r.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{r.code}</div>
                          </TableCell>
                          <TableCell>{r.city}</TableCell>
                          <TableCell>
                            {!r.active ? <Badge variant="secondary">Paused</Badge>
                              : r.campaign?.status === "completed" ? <Badge variant="outline">Completed</Badge>
                              : <Badge className="bg-[#AD3A49]">Active</Badge>}
                            {r.cap_reached && <Badge variant="destructive" className="ml-2">CAP REACHED</Badge>}
                          </TableCell>
                          <TableCell>{r.visits_today} / {r.visits_total}</TableCell>
                          <TableCell>{r.signins_today} / {r.signins_total}</TableCell>
                          <TableCell>{conv}%</TableCell>
                          <TableCell>£{r.earnings_today.toFixed(2)} / £{r.earnings_total.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/admin/promoters/${r.id}`)}>Detail</Button>
                              <Button size="sm" variant="ghost" onClick={() => copyLink(r.code)}><Copy className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => window.open(`/results/${r.code}`, "_blank")}><ExternalLink className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleActive(r.id, r.active)}>{r.active ? "Pause" : "Resume"}</Button>
                              {r.campaign?.status !== "completed" && (
                                <Button size="sm" variant="ghost" onClick={() => completeCampaign(r.id)}>Complete</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
