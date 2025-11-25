import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandEditModal } from "./BrandEditModal";
import type { Tables } from "@/integrations/supabase/types";

type Brand = Tables<"brands">;

export const BrandManagement = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    filterBrands();
  }, [searchQuery, brands]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name");

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const filterBrands = () => {
    if (!searchQuery) {
      setFilteredBrands(brands);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = brands.filter(
      (brand) =>
        brand.name.toLowerCase().includes(query) ||
        brand.country?.toLowerCase().includes(query) ||
        brand.category?.toLowerCase().includes(query)
    );
    setFilteredBrands(filtered);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setIsEditModalOpen(true);
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBrand) return;

    try {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", deletingBrand.id);

      if (error) throw error;

      // Log admin action
      await supabase.functions.invoke("log-security-event", {
        body: {
          eventType: "brand_deleted",
          eventData: { brand_id: deletingBrand.id, brand_name: deletingBrand.name },
        },
      });

      toast.success("Brand deleted successfully");
      fetchBrands();
    } catch (error: any) {
      console.error("Error deleting brand:", error);
      toast.error(error.message || "Failed to delete brand");
    } finally {
      setDeletingBrand(null);
    }
  };

  const toggleSelectBrand = (brandId: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBrands.size === filteredBrands.length) {
      setSelectedBrands(new Set());
    } else {
      setSelectedBrands(new Set(filteredBrands.map((b) => b.id)));
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedBrands.size === 0) return;

    try {
      const { error } = await supabase
        .from("brands")
        .update({ is_active: activate })
        .in("id", Array.from(selectedBrands));

      if (error) throw error;

      await supabase.functions.invoke("log-security-event", {
        body: {
          eventType: "brands_bulk_update",
          eventData: { count: selectedBrands.size, is_active: activate },
        },
      });

      toast.success(`${selectedBrands.size} brand(s) ${activate ? "activated" : "deactivated"}`);
      setSelectedBrands(new Set());
      fetchBrands();
    } catch (error: any) {
      console.error("Error updating brands:", error);
      toast.error(error.message || "Failed to update brands");
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
            <CardTitle>Brand Management</CardTitle>
            <div className="flex gap-2">
              {selectedBrands.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleBulkActivate(true)}>
                    Activate ({selectedBrands.size})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkActivate(false)}>
                    Deactivate ({selectedBrands.size})
                  </Button>
                </>
              )}
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Brand
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, country, or category..."
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
                      checked={selectedBrands.size === filteredBrands.length && filteredBrands.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Instagram</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No brands found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBrands.has(brand.id)}
                          onCheckedChange={() => toggleSelectBrand(brand.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>{brand.country || "-"}</TableCell>
                      <TableCell>
                        {brand.category ? (
                          <Badge variant="secondary">{brand.category}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {brand.instagram_url ? (
                          <a
                            href={brand.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            View
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {brand.official_website ? (
                          <a
                            href={brand.official_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            View
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={brand.is_active ? "default" : "secondary"}>
                          {brand.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(brand)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingBrand(brand)}
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
            Showing {filteredBrands.length} of {brands.length} brands
          </div>
        </CardContent>
      </Card>

      <BrandEditModal
        brand={editingBrand}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBrand(null);
        }}
        onSuccess={fetchBrands}
      />

      <AlertDialog open={!!deletingBrand} onOpenChange={() => setDeletingBrand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingBrand?.name}"? This action cannot be
              undone and may affect associated shops and drops.
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