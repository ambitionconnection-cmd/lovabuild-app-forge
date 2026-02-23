import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, FileText, Check, X, AlertCircle, Download, Pencil, Plus } from 'lucide-react';

interface ParsedDrop {
  title: string;
  brand_name: string;
  release_date: string;
  description: string;
  image_url: string;
  affiliate_link: string;
  discount_code: string;
  is_featured: boolean;
  brand_id?: string;
  slug?: string;
  valid: boolean;
  errors: string[];
  selected: boolean;
  brandUnmatched: boolean;
}

export function BulkDropImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [parsedDrops, setParsedDrops] = useState<ParsedDrop[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedDrop | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let current = '';
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\n' || (char === '\r' && next === '\n')) && !inQuotes) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
        current = '';
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    if (row.some(cell => cell !== '')) rows.push(row);

    return rows;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: brandData } = await supabase.from('brands').select('id, name');
    const brandList = brandData || [];
    setBrands(brandList);

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      toast.error('CSV must have a header row and at least one data row');
      return;
    }

    const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    const parsed: ParsedDrop[] = dataRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });

      const errors: string[] = [];
      const title = obj['title'] || '';
      const brand_name = obj['brand_name'] || '';
      const release_date = obj['release_date'] || '';

      if (!title) errors.push('Missing title');
      if (!release_date) errors.push('Missing date');

      const dateObj = new Date(release_date);
      if (release_date && isNaN(dateObj.getTime())) {
        errors.push('Invalid date (use YYYY-MM-DD)');
      }

      // Case-insensitive brand matching
      const matchedBrand = brandList.find(
        b => b.name.toLowerCase() === brand_name.toLowerCase()
      );

      const brandUnmatched = brand_name !== '' && !matchedBrand;

      return {
        title,
        brand_name,
        release_date,
        description: obj['description'] || '',
        image_url: obj['image_url'] || '',
        affiliate_link: obj['affiliate_link'] || '',
        discount_code: obj['discount_code'] || '',
        is_featured: obj['is_featured']?.toLowerCase() === 'true',
        brand_id: matchedBrand?.id,
        slug: generateSlug(title),
        valid: errors.length === 0,
        errors,
        selected: errors.length === 0, // auto-select valid drops
        brandUnmatched,
      };
    });

    setParsedDrops(parsed);
    setImported(false);
    toast.success(`Parsed ${parsed.length} drops from CSV`);

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelect = (index: number) => {
    setParsedDrops(prev => prev.map((d, i) => 
      i === index ? { ...d, selected: !d.selected } : d
    ));
  };

  const selectAll = () => {
    const allSelected = parsedDrops.every(d => d.selected);
    setParsedDrops(prev => prev.map(d => ({ ...d, selected: !allSelected })));
  };

  const selectValid = () => {
    setParsedDrops(prev => prev.map(d => ({ ...d, selected: d.valid })));
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...parsedDrops[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editForm) return;

    // Re-validate after edit
    const errors: string[] = [];
    if (!editForm.title) errors.push('Missing title');
    if (!editForm.release_date) errors.push('Missing date');
    const dateObj = new Date(editForm.release_date);
    if (editForm.release_date && isNaN(dateObj.getTime())) {
      errors.push('Invalid date (use YYYY-MM-DD)');
    }

    // Re-match brand (case-insensitive)
    const matchedBrand = brands.find(
      b => b.name.toLowerCase() === editForm.brand_name.toLowerCase()
    );

    const updated = {
      ...editForm,
      brand_id: matchedBrand?.id,
      slug: generateSlug(editForm.title),
      valid: errors.length === 0,
      errors,
      brandUnmatched: editForm.brand_name !== '' && !matchedBrand,
    };

    setParsedDrops(prev => prev.map((d, i) => i === editingIndex ? updated : d));
    setEditingIndex(null);
    setEditForm(null);
    toast.success('Drop updated');
  };

  const handleImport = async () => {
    const selectedDrops = parsedDrops.filter(d => d.selected && d.valid);
    if (selectedDrops.length === 0) {
      toast.error('No valid drops selected');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    let brandsCreated = 0;

    // First: auto-create unmatched brands
    const unmatchedBrandNames = [...new Set(
      selectedDrops
        .filter(d => d.brandUnmatched && d.brand_name)
        .map(d => d.brand_name)
    )];

    const newBrandMap: Record<string, string> = {}; // name -> id

    for (const brandName of unmatchedBrandNames) {
      const slug = generateSlug(brandName);
      const { data, error } = await supabase
        .from('brands')
        .insert({ name: brandName, slug, is_active: true })
        .select('id')
        .single();

      if (data) {
        newBrandMap[brandName.toLowerCase()] = data.id;
        brandsCreated++;
      } else {
        console.error('Failed to create brand:', brandName, error);
      }
    }

    // Now import drops
    for (const drop of selectedDrops) {
      // Use existing brand_id or newly created one
      let brandId = drop.brand_id || null;
      if (!brandId && drop.brand_name) {
        brandId = newBrandMap[drop.brand_name.toLowerCase()] || null;
      }

      const { error } = await supabase.from('drops').insert({
        title: drop.title,
        slug: drop.slug!,
        brand_id: brandId,
        release_date: drop.release_date,
        description: drop.description || null,
        image_url: drop.image_url || null,
        affiliate_link: drop.affiliate_link || null,
        discount_code: drop.discount_code || null,
        is_featured: drop.is_featured,
        status: 'upcoming',
      });

      if (error) {
        console.error('Import error:', error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    setImporting(false);
    setImported(true);

    let message = `Imported ${successCount} drops`;
    if (brandsCreated > 0) message += `, created ${brandsCreated} new brands`;
    if (errorCount > 0) message += `, ${errorCount} failed`;

    if (errorCount === 0) {
      toast.success(message);
    } else {
      toast.warning(message);
    }

    onImportComplete();
  };

  const handleDiscountCodeCopy = (drop: ParsedDrop) => {
    navigator.clipboard.writeText(drop.discount_code);
    toast.success(`Code "${drop.discount_code}" copied!`);
  };

  const downloadTemplate = () => {
    const template = `title,brand_name,release_date,description,image_url,affiliate_link,discount_code,is_featured
"Nike x Stüssy Air Force 1","Nike","2026-03-15","Limited edition collaboration","https://example.com/image.jpg","https://nike.com/launch","STUSSY10",true
"Palace Spring 2026 Week 1","Palace Skateboards","2026-03-20","First drop of the Spring season","","","",false`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drops_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = parsedDrops.filter(d => d.selected).length;
  const validSelectedCount = parsedDrops.filter(d => d.selected && d.valid).length;
  const unmatchedCount = parsedDrops.filter(d => d.brandUnmatched).length;
  const invalidCount = parsedDrops.filter(d => !d.valid).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import Drops
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import multiple drops. Brand names are matched case-insensitively. Unmatched brands are auto-created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" /> Download Template
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileText className="w-4 h-4 mr-1" /> Select CSV File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {parsedDrops.length > 0 && (
            <>
              {/* Summary badges */}
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  {parsedDrops.filter(d => d.valid).length} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="text-red-400 border-red-400/30">
                    {invalidCount} errors
                  </Badge>
                )}
                {unmatchedCount > 0 && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                    <Plus className="w-3 h-3 mr-1" />
                    {unmatchedCount} new brands will be created
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  {selectedCount} selected
                </span>
              </div>

              {/* Selection controls */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  {parsedDrops.every(d => d.selected) ? 'Deselect All' : 'Select All'}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectValid}>
                  Select Valid Only
                </Button>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={parsedDrops.length > 0 && parsedDrops.every(d => d.selected)}
                          onCheckedChange={selectAll}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-8">⭐</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedDrops.map((drop, i) => (
                      <TableRow
                        key={i}
                        className={`${!drop.valid ? 'bg-red-500/5' : ''} ${!drop.selected ? 'opacity-50' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={drop.selected}
                            onCheckedChange={() => toggleSelect(i)}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[200px] truncate">
                          {drop.title}
                        </TableCell>
                        <TableCell className="text-sm">
                          {drop.brand_id ? (
                            <span className="text-green-400">{drop.brand_name}</span>
                          ) : drop.brandUnmatched ? (
                            <span className="text-yellow-400 flex items-center gap-1" title="New brand will be created on import">
                              <Plus className="w-3 h-3" /> {drop.brand_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{drop.brand_name || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{drop.release_date}</TableCell>
                        <TableCell>{drop.is_featured ? '⭐' : '—'}</TableCell>
                        <TableCell>
                          {drop.errors.length > 0 && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {drop.errors.join(', ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(i)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Import button */}
              <Button
                onClick={handleImport}
                disabled={importing || imported || validSelectedCount === 0}
                className="w-full"
              >
                {importing
                  ? 'Importing...'
                  : imported
                    ? `Done ✓`
                    : `Import ${validSelectedCount} selected drops${unmatchedCount > 0 ? ` (+ create ${[...new Set(parsedDrops.filter(d => d.selected && d.brandUnmatched).map(d => d.brand_name))].length} new brands)` : ''}`
                }
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingIndex !== null} onOpenChange={(open) => { if (!open) { setEditingIndex(null); setEditForm(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drop</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Brand Name</Label>
                <Input
                  value={editForm.brand_name}
                  onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                  placeholder="Must match existing brand or will be created"
                />
                {editForm.brand_name && !brands.find(b => b.name.toLowerCase() === editForm.brand_name.toLowerCase()) && (
                  <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> New brand will be created on import
                  </p>
                )}
              </div>
              <div>
                <Label>Release Date * (YYYY-MM-DD)</Label>
                <Input
                  value={editForm.release_date}
                  onChange={(e) => setEditForm({ ...editForm, release_date: e.target.value })}
                  placeholder="2026-03-15"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder="Drop description..."
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={editForm.image_url}
                  onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Affiliate Link</Label>
                <Input
                  value={editForm.affiliate_link}
                  onChange={(e) => setEditForm({ ...editForm, affiliate_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Discount Code</Label>
                <Input
                  value={editForm.discount_code}
                  onChange={(e) => setEditForm({ ...editForm, discount_code: e.target.value })}
                  placeholder="e.g. SAVE10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editForm.is_featured}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_featured: checked === true })}
                />
                <Label>Featured Drop</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingIndex(null); setEditForm(null); }}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
