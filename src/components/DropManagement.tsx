import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { DropEditModal } from './DropEditModal';
import type { Tables } from '@/integrations/supabase/types';

type Drop = Tables<'drops'>;
type Brand = Tables<'brands'>;
type Shop = Tables<'shops'>;

export function DropManagement() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDrops, setSelectedDrops] = useState<string[]>([]);
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingDrop, setDeletingDrop] = useState<Drop | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dropsRes, brandsRes, shopsRes] = await Promise.all([
        supabase.from('drops').select('*').order('release_date', { ascending: false }),
        supabase.from('brands').select('*'),
        supabase.from('shops').select('*'),
      ]);

      if (dropsRes.error) throw dropsRes.error;
      if (brandsRes.error) throw brandsRes.error;
      if (shopsRes.error) throw shopsRes.error;

      setDrops(dropsRes.data || []);
      setBrands(brandsRes.data || []);
      setShops(shopsRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load drops",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDrop) return;

    try {
      const { error } = await supabase
        .from('drops')
        .delete()
        .eq('id', deletingDrop.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Drop deleted successfully",
      });

      fetchData();
      setDeletingDrop(null);
    } catch (error: any) {
      console.error('Error deleting drop:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete drop",
        variant: "destructive",
      });
    }
  };

  const toggleSelectDrop = (dropId: string) => {
    setSelectedDrops(prev =>
      prev.includes(dropId)
        ? prev.filter(id => id !== dropId)
        : [...prev, dropId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDrops.length === filteredDrops.length) {
      setSelectedDrops([]);
    } else {
      setSelectedDrops(filteredDrops.map(d => d.id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: 'upcoming' | 'live' | 'ended') => {
    try {
      const { error } = await supabase
        .from('drops')
        .update({ status: newStatus })
        .in('id', selectedDrops);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedDrops.length} drop(s) to ${newStatus}`,
      });

      setSelectedDrops([]);
      fetchData();
    } catch (error: any) {
      console.error('Error updating drops:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update drops",
        variant: "destructive",
      });
    }
  };

  const getBrandName = (brandId: string | null) => {
    if (!brandId) return 'N/A';
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Unknown';
  };

  const getShopName = (shopId: string | null) => {
    if (!shopId) return 'N/A';
    const shop = shops.find(s => s.id === shopId);
    return shop?.name || 'Unknown';
  };

  const filteredDrops = drops.filter(drop => {
    const matchesSearch = drop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getBrandName(drop.brand_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || drop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      upcoming: "default",
      live: "secondary",
      ended: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Product Drops</span>
          <div className="flex gap-2">
            {selectedDrops.length > 0 && (
              <>
                <Select onValueChange={(value) => handleBulkStatusUpdate(value as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Set to Upcoming</SelectItem>
                    <SelectItem value="live">Set to Live</SelectItem>
                    <SelectItem value="ended">Set to Ended</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setSelectedDrops([])}>
                  Clear ({selectedDrops.length})
                </Button>
              </>
            )}
            <Button onClick={() => { setEditingDrop(null); setShowEditModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Drop
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drops by title or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDrops.length === filteredDrops.length && filteredDrops.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Pro Only</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrops.map((drop) => (
                <TableRow key={drop.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDrops.includes(drop.id)}
                      onCheckedChange={() => toggleSelectDrop(drop.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{drop.title}</TableCell>
                  <TableCell>{getBrandName(drop.brand_id)}</TableCell>
                  <TableCell>{getShopName(drop.shop_id)}</TableCell>
                  <TableCell>
                    {new Date(drop.release_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(drop.status || 'upcoming')}</TableCell>
                  <TableCell>
                    {drop.is_featured ? <Badge variant="secondary">Yes</Badge> : 'No'}
                  </TableCell>
                  <TableCell>
                    {drop.is_pro_exclusive ? <Badge>Pro</Badge> : 'No'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingDrop(drop); setShowEditModal(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingDrop(drop)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDrops.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No drops found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <DropEditModal
        drop={editingDrop}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={fetchData}
      />

      <AlertDialog open={!!deletingDrop} onOpenChange={() => setDeletingDrop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drop</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDrop?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
