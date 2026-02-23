import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, Check, X, AlertCircle, Download } from 'lucide-react';

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
}

const VALID_CATEGORIES = ['streetwear', 'sneakers', 'accessories', 'luxury', 'vintage', 'sportswear', 'contemporary', 'techwear', 'outdoor', 'heritage', 'designer', 'skate'];

export function BulkBrandImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [parsedBrands, setParsedBrands] = useState<ParsedBrand[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
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

    // Check for existing brands to avoid duplicates
    const { data: existingBrands } = await supabase.from('brands').select('name, slug');
    const existingSlugs = new Set((existingBrands || []).map(b => b.slug));
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
      if (existingSlugs.has(slug) || existingNames.has(name.toLowerCase())) {
        errors.push('Brand already exists');
      }
      if (category && !VALID_CATEGORIES.includes(category)) {
        errors.push(`Invalid category (use: ${VALID_CATEGORIES.join(', ')})`);
      }

      // Validate URLs
      const urlFields = ['official_website', 'instagram_url', 'tiktok_url', 'logo_url', 'banner_url'];
      urlFields.forEach(field => {
        const val = obj[field];
        if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
          errors.push(`${field} must start with http:// or https://`);
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
      };
    });

    setParsedBrands(parsed);
    setImported(false);
    toast.success(`Parsed ${parsed.length} brands from CSV`);
  };

  const handleImport = async () => {
    const validBrands = parsedBrands.filter(b => b.valid);
    if (validBrands.length === 0) {
      toast.error('No valid brands to import');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const brand of validBrands) {
      const insertData: Record<string, unknown> = {
        name: brand.name,
        slug: brand.slug,
        is_active: true,
      };

      // Only include non-empty fields
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

  const validCount = parsedBrands.filter(b => b.valid).length;
  const invalidCount = parsedBrands.filter(b => !b.valid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Bulk Import Brands
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import multiple brands at once. Duplicate brands are automatically detected.
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
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="text-red-400 border-red-400/30">
                  {invalidCount} errors
                </Badge>
              )}
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">✓</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedBrands.map((brand, i) => (
                    <TableRow key={i} className={brand.valid ? '' : 'bg-red-500/5'}>
                      <TableCell>
                        {brand.valid ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{brand.name}</TableCell>
                      <TableCell className="text-sm">{brand.country || '—'}</TableCell>
                      <TableCell className="text-sm">{brand.category || '—'}</TableCell>
                      <TableCell className="text-sm text-[#C4956A] truncate max-w-[150px]">
                        {brand.official_website ? '✓' : '—'}
                      </TableCell>
                      <TableCell>
                        {brand.errors.length > 0 && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            {brand.errors.join(', ')}
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
              {importing ? 'Importing...' : imported ? `Imported ${validCount} brands ✓` : `Import ${validCount} valid brands`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
