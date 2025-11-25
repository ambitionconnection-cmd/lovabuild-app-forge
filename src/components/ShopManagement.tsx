import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShopEditModal } from "./ShopEditModal";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops">;
type Brand = Tables<"brands">;

export const ShopManagement = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterShops();
  }, [searchQuery, shops]);

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

  const filterShops = () => {
    if (!searchQuery) {
      setFilteredShops(shops);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(query) ||
        shop.city.toLowerCase().includes(query) ||
        shop.country.toLowerCase().includes(query) ||
        shop.address.toLowerCase().includes(query)
    );
    setFilteredShops(filtered);
  };

  const getBrandName = (brandId: string | null) => {
    if (!brandId) return "-";
    const brand = brands.find((b) => b.id === brandId);
    return brand?.name || "-";
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

    try {
      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", deletingShop.id);

      if (error) throw error;

      // Log admin action
      await supabase.functions.invoke("log-security-event", {
        body: {
          eventType: "shop_deleted",
          eventData: { shop_id: deletingShop.id, shop_name: deletingShop.name },
        },
      });

      toast.success("Shop deleted successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting shop:", error);
      toast.error(error.message || "Failed to delete shop");
    } finally {
      setDeletingShop(null);
    }
  };

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
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Shop
            </Button>
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No shops found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShops.map((shop) => (
                    <TableRow key={shop.id}>
                      <TableCell className="font-medium">{shop.name}</TableCell>
                      <TableCell>{getBrandName(shop.brand_id)}</TableCell>
                      <TableCell>{shop.city}</TableCell>
                      <TableCell>{shop.country}</TableCell>
                      <TableCell className="max-w-xs truncate">{shop.address}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={shop.is_active ? "default" : "secondary"}>
                            {shop.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {shop.is_unique_shop && (
                            <Badge variant="outline">Unique</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(shop)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingShop(shop)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
              Are you sure you want to delete "{deletingShop?.name}"? This action cannot be
              undone.
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