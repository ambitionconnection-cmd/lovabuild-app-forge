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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, Check, X, AlertCircle, Download, Pencil } from 'lucide-react';

interface ParsedBrand {
  name: string;
  description: string;
  history: string;
  country: string;
  category: string;
  official_website: string;
  instagram_url: string;
  tiktok_url: string;
  logo_url: string;
  banner_url: string;
  slug: string;
  valid: boolean;
  errors: string[];
  selected: boolean;
  isDuplicate: boolean;
}

const VALID_CATEGORIES = ['streetwear', 'sneakers', 'accessories', 'luxury', 'vintage', 'sportswear', 'contemporary', 'techwear', 'outdoor', 'heritage', 'designer', 'skate'];

export function BulkBrandImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [parsedBrands, setParsedBrands] = useState<ParsedBrand[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedBrand | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateSlug = (name: string) => {
    return name
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

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      toast.error('CSV must have a header row and at least one data row');
      return;
    }

    const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    // Check for existing brands (case-insensitive)
    const { data: existingBrands } = await supabase.from('brands').select('name, slug');
    const existingNames = new Set((existingBrands || []).map(b => b.name.toLowerCase()));

    const parsed: ParsedBrand[] = dataRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });

      const errors: string[] = [];
      const name = obj['name'] || '';
      const category = (obj['category'] || '').toLowerCase();
      const slug = generateSlug(name);

      if (!name) errors.push('Missing name');
      
      const isDuplicate = existingNames.has(name.toLowerCase());
      if (isDuplicate) errors.push('Already exists');

      if (category && !VALID_CATEGORIES.includes(category)) {
        errors.push(`Invalid category`);
      }

      // Validate URLs
      const urlFields = ['official_website', 'instagram_url', 'tiktok_url', 'logo_url', 'banner_url'];
      urlFields.forEach(field => {
        const val = obj[field];
        if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
          errors.push(`${field} needs http://`);
        }
      });

      return {
        name,
        description: obj['description'] || '',
        history: obj['history'] || '',
        country: obj['country'] || '',
        category: category || '',
        official_website: obj['official_website'] || '',
        instagram_url: obj['instagram_url'] || '',
        tiktok_url: obj['tiktok_url'] || '',
        logo_url: obj['logo_url'] || '',
        banner_url: obj['banner_url'] || '',
        slug,
        valid: errors.length === 0,
        errors,
        selected: errors.length === 0,
        isDuplicate,
      };
    });

    setParsedBrands(parsed);
    setImported(false);
    toast.success(`Parsed ${parsed.length} brands from CSV`);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelect = (index: number) => {
    setParsedBrands(prev => prev.map((b, i) =>
      i === index ? { ...b, selected: !b.selected } : b
    ));
  };

  const selectAll = () => {
    const allSelected = parsedBrands.every(b => b.selected);
    setParsedBrands(prev => prev.map(b => ({ ...b, selected: !allSelected })));
  };

  const selectValid = () => {
    setParsedBrands(prev => prev.map(b => ({ ...b, selected: b.valid })));
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...parsedBrands[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editForm) return;

    const errors: string[] = [];
    if (!editForm.name) errors.push('Missing name');
    if (editForm.category && !VALID_CATEGORIES.includes(editForm.category.toLowerCase())) {
      errors.push('Invalid category');
    }

    const urlFields = ['official_website', 'instagram_url', 'tiktok_url', 'logo_url', 'banner_url'] as const;
    urlFields.forEach(field => {
      const val = editForm[field];
      if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
        errors.push(`${field} needs http://`);
      }
    });

    const updated = {
      ...editForm,
      slug: generateSlug(editForm.name),
      category: editForm.category.toLowerCase(),
      valid: errors.length === 0,
      errors,
    };

    setParsedBrands(prev => prev.map((b, i) => i === editingIndex ? updated : b));
    setEditingIndex(null);
    setEditForm(null);
    toast.success('Brand updated');
  };

  const handleImport = async () => {
    const validBrands = parsedBrands.filter(b => b.selected && b.valid);
    if (validBrands.length === 0) {
      toast.error('No valid brands selected');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const brand of validBrands) {
      const insertData: any = {
        name: brand.name,
        slug: brand.slug,
        is_active: true,
      };

      if (brand.description) insertData.description = brand.description;
      if (brand.history) insertData.history = brand.history;
      if (brand.country) insertData.country = brand.country;
      if (brand.category) insertData.category = brand.category;
      if (brand.official_website) insertData.official_website = brand.official_website;
      if (brand.instagram_url) insertData.instagram_url = brand.instagram_url;
      if (brand.tiktok_url) insertData.tiktok_url = brand.tiktok_url;
      if (brand.logo_url) insertData.logo_url = brand.logo_url;
      if (brand.banner_url) insertData.banner_url = brand.banner_url;

      const { error } = await supabase.from('brands').insert(insertData);

      if (error) {
        console.error('Import error for', brand.name, ':', error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    setImporting(false);
    setImported(true);

    if (errorCount === 0) {
      toast.success(`Successfully imported ${successCount} brands!`);
    } else {
      toast.warning(`Imported ${successCount} brands, ${errorCount} failed`);
    }

    onImportComplete();
  };

  const downloadTemplate = () => {
    const template = `name,description,country,category,official_website,instagram_url,tiktok_url,logo_url,banner_url,history
"Example Brand","A cool streetwear label","United Kingdom","streetwear","https://example.com","https://instagram.com/example","https://tiktok.com/@example","https://example.com/logo.png","","Founded in 2020 in London..."`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brands_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = parsedBrands.filter(b => b.selected).length;
  const validSelectedCount = parsedBrands.filter(b => b.selected && b.valid).length;
  const invalidCount = parsedBrands.filter(b => !b.valid).length;
  const duplicateCount = parsedBrands.filter(b => b.isDuplicate).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import Brands
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import multiple brands. Duplicates are detected case-insensitively.
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

          {parsedBrands.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  {parsedBrands.filter(b => b.valid).length} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="text-red-400 border-red-400/30">
                    {invalidCount} errors
                  </Badge>
                )}
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                    {duplicateCount} duplicates
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">{selectedCount} selected</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  {parsedBrands.every(b => b.selected) ? 'Deselect All' : 'Select All'}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectValid}>
                  Select Valid Only
                </Button>
              </div>

              <div className="border rounded-lg overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={parsedBrands.length > 0 && parsedBrands.every(b => b.selected)}
                          onCheckedChange={selectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Links</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedBrands.map((brand, i) => (
                      <TableRow
                        key={i}
                        className={`${!brand.valid ? 'bg-red-500/5' : ''} ${!brand.selected ? 'opacity-50' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={brand.selected}
                            onCheckedChange={() => toggleSelect(i)}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[180px] truncate">
                          {brand.isDuplicate ? (
                            <span className="text-yellow-400">{brand.name} ⚠️</span>
                          ) : (
                            brand.name
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{brand.country || '—'}</TableCell>
                        <TableCell className="text-sm">{brand.category || '—'}</TableCell>
                        <TableCell className="text-sm">
                          <span className="text-[10px] text-muted-foreground">
                            {[brand.official_website && 'Web', brand.instagram_url && 'IG', brand.tiktok_url && 'TT'].filter(Boolean).join(', ') || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {brand.errors.length > 0 && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {brand.errors.join(', ')}
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

              <Button
                onClick={handleImport}
                disabled={importing || imported || validSelectedCount === 0}
                className="w-full"
              >
                {importing ? 'Importing...' : imported ? `Done ✓` : `Import ${validSelectedCount} selected brands`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingIndex !== null} onOpenChange={(open) => { if (!open) { setEditingIndex(null); setEditForm(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} placeholder="Short description (280 chars)" />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} placeholder="e.g. United Kingdom" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editForm.category || ''} onValueChange={(val) => setEditForm({ ...editForm, category: val })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {VALID_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Website</Label>
                <Input value={editForm.official_website} onChange={(e) => setEditForm({ ...editForm, official_website: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Instagram URL</Label>
                <Input value={editForm.instagram_url} onChange={(e) => setEditForm({ ...editForm, instagram_url: e.target.value })} placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label>TikTok URL</Label>
                <Input value={editForm.tiktok_url} onChange={(e) => setEditForm({ ...editForm, tiktok_url: e.target.value })} placeholder="https://tiktok.com/@..." />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input value={editForm.logo_url} onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>History / About</Label>
                <Textarea value={editForm.history} onChange={(e) => setEditForm({ ...editForm, history: e.target.value })} rows={4} placeholder="Brand story, founding, ethos..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingIndex(null); setEditForm(null); }}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
