import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Plus, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface AmbassadorCode {
  id: string;
  code: string;
  pro_duration_days: number | null;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  note: string | null;
  created_at: string;
}

export function AmbassadorCodeManagement() {
  const [codes, setCodes] = useState<AmbassadorCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [isPermanent, setIsPermanent] = useState(true);
  const [durationDays, setDurationDays] = useState(90);
  const [batchCount, setBatchCount] = useState(1);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from("ambassador_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load codes");
      console.error(error);
    } else {
      setCodes((data as AmbassadorCode[]) || []);
    }
    setLoading(false);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "FLYAF-";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const createCodes = async () => {
    setCreating(true);
    try {
      const newCodes = Array.from({ length: batchCount }, () => ({
        code: generateCode(),
        pro_duration_days: isPermanent ? null : durationDays,
        max_uses: newMaxUses,
        uses_count: 0,
        is_active: true,
        note: newNote || null,
      }));

      const { error } = await supabase.from("ambassador_codes").insert(newCodes as any);
      if (error) throw error;

      toast.success(`Created ${batchCount} ambassador code${batchCount > 1 ? "s" : ""}`);
      setNewNote("");
      setBatchCount(1);
      fetchCodes();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create codes");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("ambassador_codes")
      .update({ is_active: !currentActive } as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update code");
    } else {
      fetchCodes();
    }
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase.from("ambassador_codes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete code");
    } else {
      toast.success("Code deleted");
      fetchCodes();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const copyAllCodes = () => {
    const activeCodes = codes.filter((c) => c.is_active && c.uses_count < c.max_uses);
    const text = activeCodes.map((c) => c.code).join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${activeCodes.length} active codes`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create new codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generate Ambassador Codes
          </CardTitle>
          <CardDescription>
            Create invite codes for your ambassador network. Each code grants FLYAF Pro access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of codes</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={batchCount}
                onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max uses per code</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isPermanent} onCheckedChange={setIsPermanent} />
            <Label>Permanent Pro (no expiry)</Label>
          </div>

          {!isPermanent && (
            <div className="space-y-2">
              <Label>Pro duration (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 90)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              placeholder="e.g. London ambassadors batch 1"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
          </div>

          <Button onClick={createCodes} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Generate {batchCount} Code{batchCount > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ambassador Codes ({codes.length})</CardTitle>
              <CardDescription>
                {codes.filter((c) => c.is_active).length} active · {codes.reduce((sum, c) => sum + c.uses_count, 0)} total redemptions
              </CardDescription>
            </div>
            {codes.length > 0 && (
              <Button variant="outline" size="sm" onClick={copyAllCodes}>
                <Copy className="w-4 h-4 mr-2" />
                Copy All Active
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No ambassador codes yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-bold">
                      <button
                        onClick={() => copyCode(code.code)}
                        className="hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {code.code}
                        <Copy className="w-3 h-3 opacity-50" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {code.pro_duration_days === null ? "Permanent" : `${code.pro_duration_days}d`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.uses_count}/{code.max_uses}
                    </TableCell>
                    <TableCell>
                      {code.is_active && code.uses_count < code.max_uses ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                      ) : code.uses_count >= code.max_uses ? (
                        <Badge variant="secondary">Used Up</Badge>
                      ) : (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {code.note || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(code.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(code.id, code.is_active)}
                        >
                          {code.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteCode(code.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
