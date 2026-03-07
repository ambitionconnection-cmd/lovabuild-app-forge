import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showUndoToast } from "@/hooks/useAdminUndo";
import { ShopEditModal } from "./ShopEditModal";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops">;
type Brand = Tables<"brands">;

interface BrandGroup {
  brandId: string | null;
  brandName: string;
  shops: Shop[];
}

export const ShopManagement = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null);
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shopsResult, brandsResult] = await Promise.all([
        supabase.from("shops").select("*").order("name"),
        supabase.from("brands").select("*").order("name"),
      ]);
      if (shopsResult.error) throw shopsResult.error;
      if (brandsResult.error) throw brandsResult.error;
      setShops(shopsResult.data || []);
      setBrands(brandsResult.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = useMemo(() => {
    if (!searchQuery) return shops;
    const query = searchQuery.toLowerCase();
    return shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(query) ||
        shop.city.toLowerCase().includes(query) ||
        shop.country.toLowerCase().includes(query) ||
        shop.address.toLowerCase().includes(query)
    );
  }, [searchQuery, shops]);

  const isSearching = searchQuery.length > 0;

  const getBrandName = (brandId: string | null) => {
    if (!brandId) return "-";
    const brand = brands.find((b) => b.id === brandId);
    return brand?.name || "-";
  };

  const brandGroups = useMemo((): BrandGroup[] => {
    const groupMap = new Map<string, Shop[]>();
    const ungrouped: Shop[] = [];

    for (const shop of filteredShops) {
      if (shop.brand_id) {
        const existing = groupMap.get(shop.brand_id) || [];
        existing.push(shop);
        groupMap.set(shop.brand_id, existing);
      } else {
        ungrouped.push(shop);
      }
    }

    const groups: BrandGroup[] = [];

    const sortedEntries = Array.from(groupMap.entries()).sort((a, b) => {
      const nameA = getBrandName(a[0]);
      const nameB = getBrandName(b[0]);
      return nameA.localeCompare(nameB);
    });

    for (const [brandId, brandShops] of sortedEntries) {
      groups.push({
        brandId,
        brandName: getBrandName(brandId),
        shops: brandShops.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    for (const shop of ungrouped) {
      groups.push({ brandId: null, brandName: "-", shops: [shop] });
    }

    return groups;
  }, [filteredShops, brands]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop);
    setIsEditModalOpen(true);
  };

  const handleAdd = () => {
    setEditingShop(null);
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingShop) return;
    const shopSnapshot = { ...deletingShop };
    try {
      const { error } = await supabase.from("shops").delete().eq("id", deletingShop.id);
      if (error) throw error;
      await supabase.functions.invoke("log-security-event", {
        body: { eventType: "shop_deleted", eventData: { shop_id: deletingShop.id, shop_name: deletingShop.name } },
      });
      setShops(prev => prev.filter(s => s.id !== deletingShop.id));
      setSelectedShops(prev => {
        const next = new Set(prev);
        next.delete(deletingShop.id);
        return next;
      });
      showUndoToast({
        message: `"${shopSnapshot.name}" deleted`,
        table: "shops",
        undoData: shopSnapshot,
        undoType: "reinsert",
        onUndo: () => fetchData(),
      });
    } catch (error: any) {
      console.error("Error deleting shop:", error);
      toast.error(error.message || "Failed to delete shop");
    } finally {
      setDeletingShop(null);
    }
  };

  const toggleSelectShop = (shopId: string) => {
    setSelectedShops((prev) => {
      const next = new Set(prev);
      if (next.has(shopId)) next.delete(shopId);
      else next.add(shopId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedShops.size === filteredShops.length) {
      setSelectedShops(new Set());
    } else {
      setSelectedShops(new Set(filteredShops.map((s) => s.id)));
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedShops.size === 0) return;
    const ids = Array.from(selectedShops);
    const previousStates = shops.filter(s => ids.includes(s.id)).map(s => ({ id: s.id, is_active: s.is_active }));
    try {
      const { error } = await supabase
        .from("shops")
        .update({ is_active: activate })
        .in("id", ids);
      if (error) throw error;
      await supabase.functions.invoke("log-security-event", {
        body: { eventType: "shops_bulk_update", eventData: { count: selectedShops.size, is_active: activate } },
      });
      const count = selectedShops.size;
      setSelectedShops(new Set());
      fetchData();
      showUndoToast({
        message: `${count} shop(s) ${activate ? "activated" : "deactivated"}`,
        table: "shops",
        undoData: previousStates,
        undoType: "update",
        updateColumn: "is_active",
        onUndo: () => fetchData(),
      });
    } catch (error: any) {
      console.error("Error updating shops:", error);
      toast.error(error.message || "Failed to update shops");
    }
  };

  const renderShopRow = (shop: Shop, indent = false) => (
    <TableRow key={shop.id}>
      <TableCell>
        <Checkbox checked={selectedShops.has(shop.id)} onCheckedChange={() => toggleSelectShop(shop.id)} />
      </TableCell>
      <TableCell className={`font-medium ${indent ? "pl-8" : ""}`}>{shop.name}</TableCell>
      <TableCell>{getBrandName(shop.brand_id)}</TableCell>
      <TableCell>{shop.city}</TableCell>
      <TableCell>{shop.country}</TableCell>
      <TableCell className="max-w-xs truncate">{shop.address}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Badge variant={shop.is_active ? "default" : "secondary"}>
            {shop.is_active ? "Active" : "Inactive"}
          </Badge>
          {shop.is_unique_shop && <Badge variant="outline">Unique</Badge>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(shop)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeletingShop(shop)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shop Management</CardTitle>
            <div className="flex gap-2">
              {selectedShops.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleBulkActivate(true)}>
                    Activate ({selectedShops.size})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkActivate(false)}>
                    Deactivate ({selectedShops.size})
                  </Button>
                </>
              )}
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Shop
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, country, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedShops.size === filteredShops.length && filteredShops.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No shops found
                    </TableCell>
                  </TableRow>
                ) : isSearching ? (
                  // Flat list when searching
                  filteredShops.map((shop) => renderShopRow(shop))
                ) : (
                  // Grouped view
                  brandGroups.map((group) => {
                    const groupKey = group.brandId || `ungrouped-${group.shops[0]?.id}`;
                    const isMulti = group.shops.length > 1;
                    const isExpanded = expandedGroups.has(groupKey);

                    if (!isMulti) {
                      // Single shop or no brand — render directly
                      return renderShopRow(group.shops[0]);
                    }

                    // Collapsible brand group
                    return (
                      <>
                        <TableRow
                          key={`group-${groupKey}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell colSpan={6} className="font-semibold">
                            {group.brandName}
                            <Badge variant="secondary" className="ml-2">
                              {group.shops.length} shops
                            </Badge>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                        {isExpanded &&
                          group.shops.map((shop) => renderShopRow(shop, true))}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredShops.length} of {shops.length} shops
          </div>
        </CardContent>
      </Card>

      <ShopEditModal
        shop={editingShop}
        brands={brands}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingShop(null);
        }}
        onSuccess={fetchData}
      />

      <AlertDialog open={!!deletingShop} onOpenChange={() => setDeletingShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shop</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingShop?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
