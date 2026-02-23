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
import { Upload, FileText, Check, X, AlertCircle, Download, Pencil, Plus, MapPin } from 'lucide-react';

interface ParsedShop {
  name: string;
  brand_name: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  description: string;
  official_site: string;
  email: string;
  phone: string;
  image_url: string;
  is_unique_shop: boolean;
  brand_id?: string;
  slug: string;
  valid: boolean;
  errors: string[];
  selected: boolean;
  brandUnmatched: boolean;
}

export function BulkShopImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [parsedShops, setParsedShops] = useState<ParsedShop[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedShop | null>(null);
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

    const parsed: ParsedShop[] = dataRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });

      const errors: string[] = [];
      const name = obj['name'] || '';
      const brand_name = obj['brand_name'] || '';
      const address = obj['address'] || '';
      const city = obj['city'] || '';
      const country = obj['country'] || '';
      const latitude = obj['latitude'] || '';
      const longitude = obj['longitude'] || '';

      if (!name) errors.push('Missing name');
      if (!address) errors.push('Missing address');
      if (!city) errors.push('Missing city');
      if (!country) errors.push('Missing country');

      if (!latitude || !longitude) {
        errors.push('Missing coordinates');
      } else {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Invalid latitude');
        if (isNaN(lng) || lng < -180 || lng > 180) errors.push('Invalid longitude');
      }

      // Case-insensitive brand matching
      const matchedBrand = brandList.find(
        b => b.name.toLowerCase() === brand_name.toLowerCase()
      );
      const brandUnmatched = brand_name !== '' && !matchedBrand;

      return {
        name,
        brand_name,
        address,
        city,
        country,
        latitude,
        longitude,
        description: obj['description'] || '',
        official_site: obj['official_site'] || '',
        email: obj['email'] || '',
        phone: obj['phone'] || '',
        image_url: obj['image_url'] || '',
        is_unique_shop: (obj['is_unique_shop'] || '').toLowerCase() === 'true',
        brand_id: matchedBrand?.id,
        slug: generateSlug(name),
        valid: errors.length === 0,
        errors,
        selected: errors.length === 0,
        brandUnmatched,
      };
    });

    setParsedShops(parsed);
    setImported(false);
    toast.success(`Parsed ${parsed.length} shops from CSV`);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelect = (index: number) => {
    setParsedShops(prev => prev.map((s, i) =>
      i === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAll = () => {
    const allSelected = parsedShops.every(s => s.selected);
    setParsedShops(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  const selectValid = () => {
    setParsedShops(prev => prev.map(s => ({ ...s, selected: s.valid })));
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...parsedShops[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editForm) return;

    const errors: string[] = [];
    if (!editForm.name) errors.push('Missing name');
    if (!editForm.address) errors.push('Missing address');
    if (!editForm.city) errors.push('Missing city');
    if (!editForm.country) errors.push('Missing country');

    if (!editForm.latitude || !editForm.longitude) {
      errors.push('Missing coordinates');
    } else {
      const lat = parseFloat(editForm.latitude);
      const lng = parseFloat(editForm.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Invalid latitude');
      if (isNaN(lng) || lng < -180 || lng > 180) errors.push('Invalid longitude');
    }

    const matchedBrand = brands.find(
      b => b.name.toLowerCase() === editForm.brand_name.toLowerCase()
    );

    const updated = {
      ...editForm,
      brand_id: matchedBrand?.id,
      slug: generateSlug(editForm.name),
      valid: errors.length === 0,
      errors,
      brandUnmatched: editForm.brand_name !== '' && !matchedBrand,
    };

    setParsedShops(prev => prev.map((s, i) => i === editingIndex ? updated : s));
    setEditingIndex(null);
    setEditForm(null);
    toast.success('Shop updated');
  };

  const handleImport = async () => {
    const selectedShops = parsedShops.filter(s => s.selected && s.valid);
    if (selectedShops.length === 0) {
      toast.error('No valid shops selected');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    let brandsCreated = 0;

    // Auto-create unmatched brands
    const unmatchedBrandNames = [...new Set(
      selectedShops
        .filter(s => s.brandUnmatched && s.brand_name)
        .map(s => s.brand_name)
    )];

    const newBrandMap: Record<string, string> = {};

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

    for (const shop of selectedShops) {
      let brandId = shop.brand_id || null;
      if (!brandId && shop.brand_name) {
        brandId = newBrandMap[shop.brand_name.toLowerCase()] || null;
      }

      const insertData: Record<string, unknown> = {
        name: shop.name,
        slug: shop.slug,
        address: shop.address,
        city: shop.city,
        country: shop.country,
        latitude: parseFloat(shop.latitude),
        longitude: parseFloat(shop.longitude),
        is_active: true,
        is_unique_shop: shop.is_unique_shop,
      };

      if (brandId) insertData.brand_id = brandId;
      if (shop.description) insertData.description = shop.description;
      if (shop.official_site) insertData.official_site = shop.official_site;
      if (shop.email) insertData.email = shop.email;
      if (shop.phone) insertData.phone = shop.phone;
      if (shop.image_url) insertData.image_url = shop.image_url;

      const { error } = await supabase.from('shops').insert(insertData);

      if (error) {
        console.error('Import error for', shop.name, ':', error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    setImporting(false);
    setImported(true);

    let message = `Imported ${successCount} shops`;
    if (brandsCreated > 0) message += `, created ${brandsCreated} new brands`;
    if (errorCount > 0) message += `, ${errorCount} failed`;

    if (errorCount === 0) {
      toast.success(message + ' — new pins will appear on the map!');
    } else {
      toast.warning(message);
    }

    onImportComplete();
  };

  const downloadTemplate = () => {
    const template = `name,brand_name,address,city,country,latitude,longitude,description,official_site,email,phone,image_url,is_unique_shop
"Supreme London","Supreme","2-3 Peter St","London","United Kingdom","51.5133","-0.1347","Supreme's London flagship store","https://supremenewyork.com","","","",false
"Dover Street Market London","Dover Street Market","18-22 Haymarket","London","United Kingdom","51.5093","-0.1318","Multi-brand luxury concept store","https://london.doverstreetmarket.com","","","",true
"Stüssy Paris","Stüssy","7 Rue Dupetit-Thouars","Paris","France","48.8665","2.3626","Stüssy flagship in Le Marais","https://stussy.com","","","",false`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shops_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = parsedShops.filter(s => s.selected).length;
  const validSelectedCount = parsedShops.filter(s => s.selected && s.valid).length;
  const unmatchedCount = parsedShops.filter(s => s.brandUnmatched && s.selected).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Bulk Import Shops
          </CardTitle>
          <CardDescription>
            Upload a CSV to add multiple shop locations. Latitude/longitude required for map pins. Use Google Maps to find coordinates (right-click any location → copy coordinates).
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

          {parsedShops.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  {parsedShops.filter(s => s.valid).length} valid
                </Badge>
                {parsedShops.some(s => !s.valid) && (
                  <Badge variant="outline" className="text-red-400 border-red-400/30">
                    {parsedShops.filter(s => !s.valid).length} errors
                  </Badge>
                )}
                {unmatchedCount > 0 && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                    <Plus className="w-3 h-3 mr-1" />
                    {[...new Set(parsedShops.filter(s => s.brandUnmatched && s.selected).map(s => s.brand_name))].length} new brands
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">{selectedCount} selected</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  {parsedShops.every(s => s.selected) ? 'Deselect All' : 'Select All'}
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
                          checked={parsedShops.length > 0 && parsedShops.every(s => s.selected)}
                          onCheckedChange={selectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Coords</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedShops.map((shop, i) => (
                      <TableRow
                        key={i}
                        className={`${!shop.valid ? 'bg-red-500/5' : ''} ${!shop.selected ? 'opacity-50' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={shop.selected}
                            onCheckedChange={() => toggleSelect(i)}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[150px] truncate">{shop.name}</TableCell>
                        <TableCell className="text-sm">
                          {shop.brand_id ? (
                            <span className="text-green-400">{shop.brand_name}</span>
                          ) : shop.brandUnmatched ? (
                            <span className="text-yellow-400 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> {shop.brand_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{shop.brand_name || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{shop.city}, {shop.country}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {shop.latitude && shop.longitude ? `${parseFloat(shop.latitude).toFixed(3)}, ${parseFloat(shop.longitude).toFixed(3)}` : '—'}
                        </TableCell>
                        <TableCell>
                          {shop.errors.length > 0 && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {shop.errors.join(', ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}>
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
                {importing
                  ? 'Importing...'
                  : imported
                    ? 'Done ✓'
                    : `Import ${validSelectedCount} shops as map pins${unmatchedCount > 0 ? ` (+ create ${[...new Set(parsedShops.filter(s => s.selected && s.brandUnmatched).map(s => s.brand_name))].length} brands)` : ''}`
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
            <DialogTitle>Edit Shop</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Brand Name</Label>
                <Input value={editForm.brand_name} onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })} placeholder="Match existing brand or leave empty" />
                {editForm.brand_name && !brands.find(b => b.name.toLowerCase() === editForm.brand_name.toLowerCase()) && (
                  <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> New brand will be created
                  </p>
                )}
              </div>
              <div>
                <Label>Address *</Label>
                <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Full street address" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>City *</Label>
                  <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                </div>
                <div>
                  <Label>Country *</Label>
                  <Input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Latitude * <span className="text-[10px] text-muted-foreground">(e.g. 51.5074)</span></Label>
                  <Input value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })} placeholder="51.5074" />
                </div>
                <div>
                  <Label>Longitude * <span className="text-[10px] text-muted-foreground">(e.g. -0.1278)</span></Label>
                  <Input value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })} placeholder="-0.1278" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={editForm.official_site} onChange={(e) => setEditForm({ ...editForm, official_site: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editForm.is_unique_shop}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_unique_shop: checked === true })}
                />
                <Label>Unique/Independent Shop <span className="text-[10px] text-muted-foreground">(not a brand outlet)</span></Label>
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
