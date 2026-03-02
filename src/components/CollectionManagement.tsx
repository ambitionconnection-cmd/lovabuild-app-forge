import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Layers, Trash2, Plus, X, GripVertical } from 'lucide-react';

interface CollectionEntry {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  brand_ids: string[];
  is_active: boolean;
  sort_order: number;
}

interface Props {
  brands: Tables<'brands'>[];
}

export const CollectionManagement = ({ brands }: Props) => {
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [addBrandId, setAddBrandId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    const { data } = await (supabase.from('collections') as any)
      .select('id, title, slug, description, brand_ids, is_active, sort_order')
      .order('sort_order', { ascending: true });
    setCollections(data || []);
    setLoading(false);
  };

  const generateSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const saveCollection = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (selectedBrandIds.length === 0) { toast.error('Add at least one brand'); return; }

    const slug = generateSlug(title);
    const payload = {
      title: title.trim(),
      slug,
      description: description.trim() || null,
      brand_ids: selectedBrandIds,
      is_active: true,
      sort_order: collections.length,
    };

    if (editingId) {
      const { error } = await (supabase.from('collections') as any)
        .update(payload)
        .eq('id', editingId);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Collection updated');
    } else {
      const { error } = await (supabase.from('collections') as any).insert(payload);
      if (error) { toast.error(error.message.includes('duplicate') ? 'Slug already exists' : 'Failed to create'); return; }
      toast.success('Collection created');
    }

    resetForm();
    fetchCollections();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedBrandIds([]);
    setEditingId(null);
  };

  const startEdit = (col: CollectionEntry) => {
    setEditingId(col.id);
    setTitle(col.title);
    setDescription(col.description || '');
    setSelectedBrandIds(col.brand_ids);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase.from('collections') as any).update({ is_active: !current }).eq('id', id);
    fetchCollections();
  };

  const deleteCollection = async (id: string) => {
    await (supabase.from('collections') as any).delete().eq('id', id);
    toast.success('Deleted');
    fetchCollections();
  };

  const addBrand = () => {
    if (addBrandId && !selectedBrandIds.includes(addBrandId)) {
      setSelectedBrandIds(prev => [...prev, addBrandId]);
    }
    setAddBrandId('');
  };

  const removeBrand = (id: string) => {
    setSelectedBrandIds(prev => prev.filter(b => b !== id));
  };

  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || 'Unknown';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#C4956A]" />
          Curated Collections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form */}
        <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Japanese Streetwear" maxLength={100} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." maxLength={300} className="h-9 text-sm" />
            </div>
          </div>

          {/* Brand picker */}
          <div>
            <Label className="text-xs">Brands</Label>
            <div className="flex gap-2">
              <Select value={addBrandId} onValueChange={setAddBrandId}>
                <SelectTrigger className="h-9 text-sm flex-1">
                  <SelectValue placeholder="Select brand to add..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {brands
                    .filter(b => !selectedBrandIds.includes(b.id))
                    .map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={addBrand} disabled={!addBrandId} className="h-9">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {selectedBrandIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedBrandIds.map(id => (
                  <Badge key={id} variant="secondary" className="text-[11px] gap-1 pr-1">
                    {getBrandName(id)}
                    <button onClick={() => removeBrand(id)} className="ml-0.5 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={saveCollection} className="flex-1">
              {editingId ? 'Update Collection' : 'Create Collection'}
            </Button>
            {editingId && (
              <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {collections.map(col => (
            <div key={col.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{col.title}</p>
                  <Badge variant="secondary" className="text-[10px]">{col.brand_ids.length} brands</Badge>
                  {!col.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                </div>
                {col.description && (
                  <p className="text-[10px] text-muted-foreground truncate">{col.description}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => startEdit(col)}>Edit</Button>
              <Switch checked={col.is_active} onCheckedChange={() => toggleActive(col.id, col.is_active)} />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCollection(col.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          {collections.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">No collections yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
