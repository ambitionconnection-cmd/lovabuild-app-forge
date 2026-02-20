import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, Check, X, AlertCircle, Download } from 'lucide-react';

interface ParsedDrop {
  title: string;
  brand_name: string;
  release_date: string;
  description: string;
  image_url: string;
  affiliate_link: string;
  discount_code: string;
  is_featured: boolean;
  // resolved
  brand_id?: string;
  slug?: string;
  valid: boolean;
  errors: string[];
}

export function BulkDropImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [parsedDrops, setParsedDrops] = useState<ParsedDrop[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
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

    // Fetch brands for matching
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
      if (!release_date) errors.push('Missing release_date');

      // Validate date format
      const dateObj = new Date(release_date);
      if (release_date && isNaN(dateObj.getTime())) {
        errors.push('Invalid date format (use YYYY-MM-DD)');
      }

      // Match brand
      const matchedBrand = brandList.find(
        b => b.name.toLowerCase() === brand_name.toLowerCase()
      );

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
      };
    });

    setParsedDrops(parsed);
    setImported(false);
    toast.success(`Parsed ${parsed.length} drops from CSV`);
  };

  const handleImport = async () => {
    const validDrops = parsedDrops.filter(d => d.valid);
    if (validDrops.length === 0) {
      toast.error('No valid drops to import');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const drop of validDrops) {
      const { error } = await supabase.from('drops').insert({
        title: drop.title,
        slug: drop.slug!,
        brand_id: drop.brand_id || null,
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

    if (errorCount === 0) {
      toast.success(`Successfully imported ${successCount} drops!`);
    } else {
      toast.warning(`Imported ${successCount} drops, ${errorCount} failed`);
    }

    onImportComplete();
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

  const validCount = parsedDrops.filter(d => d.valid).length;
  const invalidCount = parsedDrops.filter(d => !d.valid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Bulk Import Drops
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import multiple drops at once. Brand names are matched to existing brands in the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
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

        {/* Preview */}
        {parsedDrops.length > 0 && (
          <>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="text-red-400 border-red-400/30">
                  {invalidCount} errors
                </Badge>
              )}
              <span className="text-muted-foreground text-xs">
                {parsedDrops.filter(d => d.brand_id).length} / {parsedDrops.length} brands matched
              </span>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">✓</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedDrops.map((drop, i) => (
                    <TableRow key={i} className={drop.valid ? '' : 'bg-red-500/5'}>
                      <TableCell>
                        {drop.valid ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{drop.title}</TableCell>
                      <TableCell className="text-sm">
                        {drop.brand_id ? (
                          <span className="text-green-400">{drop.brand_name}</span>
                        ) : (
                          <span className="text-yellow-400" title="Brand not found in database">
                            {drop.brand_name || '—'} ⚠️
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{drop.release_date}</TableCell>
                      <TableCell>{drop.is_featured ? '⭐' : '—'}</TableCell>
                      <TableCell>
                        {drop.errors.length > 0 && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {drop.errors.join(', ')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button
              onClick={handleImport}
              disabled={importing || imported || validCount === 0}
              className="w-full"
            >
              {importing ? 'Importing...' : imported ? `Imported ${validCount} drops ✓` : `Import ${validCount} valid drops`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
