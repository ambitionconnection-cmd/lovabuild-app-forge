import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Star, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface FeaturedEntry {
  id: string;
  brand_id: string;
  start_date: string;
  end_date: string;
  description: string | null;
  is_active: boolean;
  brands: { name: string; logo_url: string | null } | null;
}

interface Props {
  brands: Tables<'brands'>[];
}

export const FeaturedBrandManagement = ({ brands }: Props) => {
  const [entries, setEntries] = useState<FeaturedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchEntries();
    // Default end date to 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setEndDate(d.toISOString().split('T')[0]);
  }, []);

  const fetchEntries = async () => {
    const { data } = await (supabase.from('featured_brands') as any)
      .select('*, brands(name, logo_url)')
      .order('start_date', { ascending: false })
      .limit(20);
    setEntries(data || []);
    setLoading(false);
  };

  const addEntry = async () => {
    if (!selectedBrandId) {
      toast.error('Select a brand');
      return;
    }
    const { error } = await (supabase.from('featured_brands') as any).insert({
      brand_id: selectedBrandId,
      start_date: startDate,
      end_date: endDate,
      description: description.trim() || null,
      is_active: true,
    });
    if (error) {
      toast.error('Failed to add featured brand');
    } else {
      toast.success('Featured brand added');
      setDescription('');
      setSelectedBrandId('');
      fetchEntries();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase.from('featured_brands') as any)
      .update({ is_active: !current })
      .eq('id', id);
    fetchEntries();
  };

  const deleteEntry = async (id: string) => {
    await (supabase.from('featured_brands') as any).delete().eq('id', id);
    toast.success('Deleted');
    fetchEntries();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-[#C4956A]" />
          Brand of the Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-border rounded-lg bg-muted/30">
          <div>
            <Label className="text-xs">Brand</Label>
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select brand..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {brands.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short highlight text..."
              maxLength={200}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="md:col-span-2">
            <Button size="sm" onClick={addEntry} className="w-full">
              <Plus className="w-3 h-3 mr-1" />
              Add Featured Brand
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {entries.map(entry => {
            const today = new Date().toISOString().split('T')[0];
            const isLive = entry.is_active && entry.start_date <= today && entry.end_date >= today;
            return (
              <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{entry.brands?.name || 'Unknown'}</p>
                    {isLive && <Badge className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">LIVE</Badge>}
                    {!entry.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(entry.start_date), 'MMM d')} — {format(new Date(entry.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Switch checked={entry.is_active} onCheckedChange={() => toggleActive(entry.id, entry.is_active)} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry(entry.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            );
          })}
          {entries.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">No featured brands yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
