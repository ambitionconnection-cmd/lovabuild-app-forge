import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, Loader2, Users, Store, FileSpreadsheet } from 'lucide-react';
import { exportBrandsCSV, exportShopsCSV, exportShopsSummaryCSV } from '@/lib/csvExport';

export function DataExports() {
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleExportBrands = async () => {
    setLoadingBrands(true);
    try {
      const result = await exportBrandsCSV();
      if (result.success) {
        toast.success(`Exported ${result.count} brands to CSV`);
      } else {
        toast.error(`Failed to export brands: ${result.error}`);
      }
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleExportShops = async () => {
    setLoadingShops(true);
    try {
      const result = await exportShopsCSV();
      if (result.success) {
        toast.success(`Exported ${result.count} shops to CSV`);
      } else {
        toast.error(`Failed to export shops: ${result.error}`);
      }
    } finally {
      setLoadingShops(false);
    }
  };

  const handleExportSummary = async () => {
    setLoadingSummary(true);
    try {
      const result = await exportShopsSummaryCSV();
      if (result.success) {
        toast.success(`Exported summary for ${result.count} brands to CSV`);
      } else {
        toast.error(`Failed to export summary: ${result.error}`);
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Data Exports
        </CardTitle>
        <CardDescription>
          Export fresh data from the database as CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Brands Export */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Brands Export
              </CardTitle>
              <CardDescription className="text-xs">
                All active brands with website, social handles, and shop count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-3 space-y-1">
                <p><strong>Columns:</strong></p>
                <ul className="list-disc list-inside">
                  <li>Brand Name</li>
                  <li>Website</li>
                  <li>Instagram Handle</li>
                  <li>TikTok Handle</li>
                  <li>Number of Shops</li>
                </ul>
              </div>
              <Button 
                onClick={handleExportBrands} 
                disabled={loadingBrands}
                className="w-full"
              >
                {loadingBrands ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Brands CSV
              </Button>
            </CardContent>
          </Card>

          {/* Shops Export */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Shops Export (Detailed)
              </CardTitle>
              <CardDescription className="text-xs">
                All active shops with brand, location, and address details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-3 space-y-1">
                <p><strong>Columns:</strong></p>
                <ul className="list-disc list-inside">
                  <li>Brand Name</li>
                  <li>Total Brand Shops</li>
                  <li>Shop Name</li>
                  <li>Country, City, Address</li>
                </ul>
              </div>
              <Button 
                onClick={handleExportShops} 
                disabled={loadingShops}
                className="w-full"
              >
                {loadingShops ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Shops CSV
              </Button>
            </CardContent>
          </Card>

          {/* Shops Summary Export */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Shops Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Shops grouped by brand with country breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-3 space-y-1">
                <p><strong>Format:</strong></p>
                <p className="italic">SUPREME (18 shops) - USA (3): NYC | LA | Chicago // JAPAN (5): Tokyo | Osaka...</p>
              </div>
              <Button 
                onClick={handleExportSummary} 
                disabled={loadingSummary}
                className="w-full"
                variant="outline"
              >
                {loadingSummary ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Summary CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
