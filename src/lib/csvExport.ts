import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BrandExport {
  brand_name: string;
  website: string;
  instagram_handle: string;
  tiktok_handle: string;
  shop_count: number;
}

interface ShopExport {
  brand_name: string;
  brand_shop_count: number;
  shop_name: string;
  country: string;
  city: string;
  address: string;
}

// Extract handle from URL
const extractHandle = (url: string | null): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    return path.split('/').filter(Boolean).pop() || '';
  } catch {
    return url;
  }
};

// Download CSV file
const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export brands with shop counts
export const exportBrandsCSV = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Fetch all active brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name, official_website, instagram_url, tiktok_url')
      .eq('is_active', true)
      .order('name');

    if (brandsError) throw brandsError;

    // Fetch shop counts per brand
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('brand_id')
      .eq('is_active', true);

    if (shopsError) throw shopsError;

    // Count shops per brand
    const shopCounts: Record<string, number> = {};
    shops?.forEach(shop => {
      if (shop.brand_id) {
        shopCounts[shop.brand_id] = (shopCounts[shop.brand_id] || 0) + 1;
      }
    });

    // Build export data
    const exportData: BrandExport[] = (brands || []).map(brand => ({
      brand_name: brand.name,
      website: brand.official_website || '',
      instagram_handle: extractHandle(brand.instagram_url),
      tiktok_handle: extractHandle(brand.tiktok_url),
      shop_count: shopCounts[brand.id] || 0,
    }));

    // Generate CSV
    const headers = ['Brand Name', 'Website', 'Instagram Handle', 'TikTok Handle', 'Number of Shops'];
    const rows = exportData.map(brand => [
      `"${brand.brand_name.replace(/"/g, '""')}"`,
      `"${brand.website}"`,
      `"${brand.instagram_handle}"`,
      `"${brand.tiktok_handle}"`,
      brand.shop_count.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const filename = `brands_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
    downloadCSV(csvContent, filename);

    return { success: true, count: exportData.length };
  } catch (error) {
    console.error('Error exporting brands:', error);
    return { success: false, count: 0, error: String(error) };
  }
};

// Export shops grouped by brand and country
export const exportShopsCSV = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Fetch all active shops with brand info
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name, brand_id, country, city, address')
      .eq('is_active', true)
      .order('country')
      .order('city');

    if (shopsError) throw shopsError;

    // Fetch brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name');

    if (brandsError) throw brandsError;

    // Create brand lookup
    const brandLookup: Record<string, string> = {};
    brands?.forEach(brand => {
      brandLookup[brand.id] = brand.name;
    });

    // Count shops per brand
    const shopCountsByBrand: Record<string, number> = {};
    shops?.forEach(shop => {
      const brandKey = shop.brand_id || 'independent';
      shopCountsByBrand[brandKey] = (shopCountsByBrand[brandKey] || 0) + 1;
    });

    // Build export data
    const exportData: ShopExport[] = (shops || []).map(shop => ({
      brand_name: shop.brand_id ? (brandLookup[shop.brand_id] || 'Unknown Brand') : 'Independent',
      brand_shop_count: shopCountsByBrand[shop.brand_id || 'independent'] || 0,
      shop_name: shop.name,
      country: shop.country,
      city: shop.city,
      address: shop.address,
    }));

    // Generate CSV
    const headers = ['Brand Name', 'Total Brand Shops', 'Shop Name', 'Country', 'City', 'Address'];
    const rows = exportData.map(shop => [
      `"${shop.brand_name.replace(/"/g, '""')}"`,
      shop.brand_shop_count.toString(),
      `"${shop.shop_name.replace(/"/g, '""')}"`,
      `"${shop.country.replace(/"/g, '""')}"`,
      `"${shop.city.replace(/"/g, '""')}"`,
      `"${shop.address.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const filename = `shops_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
    downloadCSV(csvContent, filename);

    return { success: true, count: exportData.length };
  } catch (error) {
    console.error('Error exporting shops:', error);
    return { success: false, count: 0, error: String(error) };
  }
};

// Export shops summary grouped by brand with country breakdown
export const exportShopsSummaryCSV = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Fetch all active shops
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name, brand_id, country, city')
      .eq('is_active', true);

    if (shopsError) throw shopsError;

    // Fetch brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name');

    if (brandsError) throw brandsError;

    // Create brand lookup
    const brandLookup: Record<string, string> = {};
    brands?.forEach(brand => {
      brandLookup[brand.id] = brand.name;
    });

    // Group shops by brand, then by country, then collect cities
    interface BrandData {
      totalShops: number;
      countries: Record<string, { count: number; cities: string[] }>;
    }
    
    const brandGroups: Record<string, BrandData> = {};
    
    shops?.forEach(shop => {
      const brandName = shop.brand_id ? (brandLookup[shop.brand_id] || 'Unknown Brand') : 'Independent';
      
      if (!brandGroups[brandName]) {
        brandGroups[brandName] = { totalShops: 0, countries: {} };
      }
      
      brandGroups[brandName].totalShops++;
      
      if (!brandGroups[brandName].countries[shop.country]) {
        brandGroups[brandName].countries[shop.country] = { count: 0, cities: [] };
      }
      
      brandGroups[brandName].countries[shop.country].count++;
      if (!brandGroups[brandName].countries[shop.country].cities.includes(shop.city)) {
        brandGroups[brandName].countries[shop.country].cities.push(shop.city);
      }
    });

    // Build summary rows
    const summaryRows: string[] = [];
    
    Object.entries(brandGroups)
      .sort((a, b) => b[1].totalShops - a[1].totalShops)
      .forEach(([brandName, data]) => {
        const countryBreakdown = Object.entries(data.countries)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([country, info]) => {
            const citiesList = info.cities.sort().join(' | ');
            return `${country} (${info.count}): ${citiesList}`;
          })
          .join(' // ');
        
        summaryRows.push([
          `"${brandName.replace(/"/g, '""')}"`,
          data.totalShops.toString(),
          `"${countryBreakdown.replace(/"/g, '""')}"`,
        ].join(','));
      });

    const headers = ['Brand Name', 'Total Shops', 'Country Breakdown (Country (count): Cities)'];
    const csvContent = [headers.join(','), ...summaryRows].join('\n');

    const filename = `shops_summary_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
    downloadCSV(csvContent, filename);

    return { success: true, count: Object.keys(brandGroups).length };
  } catch (error) {
    console.error('Error exporting shops summary:', error);
    return { success: false, count: 0, error: String(error) };
  }
};
