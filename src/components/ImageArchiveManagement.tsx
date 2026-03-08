import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Archive, Download, Trash2, Loader2, ImageIcon, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format, subMonths } from "date-fns";

interface ArchivedImage {
  id: string;
  image_url: string;
  caption: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  status: string;
  user_id: string;
}

export const ImageArchiveManagement = () => {
  const [images, setImages] = useState<ArchivedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const archiveThreshold = subMonths(new Date(), 6);

  const fetchArchivedImages = async () => {
    setLoading(true);
    // Fetch both explicitly archived posts AND posts older than 6 months
    const { data: archivedData } = await supabase
      .from("street_spotted_posts")
      .select("id, image_url, caption, city, country, created_at, status, user_id")
      .eq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: oldData } = await supabase
      .from("street_spotted_posts")
      .select("id, image_url, caption, city, country, created_at, status, user_id")
      .lt("created_at", archiveThreshold.toISOString())
      .neq("status", "archived")
      .order("created_at", { ascending: true })
      .limit(200);

    const allImages = [...(archivedData || []), ...(oldData || [])];
    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allImages.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });

    setImages(unique as ArchivedImage[]);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    fetchOldImages();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map(i => i.id)));
    }
  };

  const handleBulkDownload = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one image");
      return;
    }

    setDownloading(true);
    try {
      const selectedImages = images.filter(i => selected.has(i.id));
      const imageUrls = selectedImages.map(i => i.image_url);

      const { data, error } = await supabase.functions.invoke("bulk-download-images", {
        body: { image_urls: imageUrls },
      });

      if (error) throw error;

      // The edge function returns a base64-encoded ZIP
      if (data?.zip_base64) {
        const byteCharacters = atob(data.zip_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/zip" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `street-spotted-archive-${format(new Date(), "yyyy-MM-dd")}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast.success(`Downloaded ${selected.size} images as ZIP`);
      } else {
        throw new Error("No ZIP data returned");
      }
    } catch (err) {
      console.error("Bulk download failed:", err);
      toast.error("Failed to download images. Try selecting fewer images.");
    } finally {
      setDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one image");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${selected.size} image(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const selectedImages = images.filter(i => selected.has(i.id));

      // Delete storage files
      const filePaths = selectedImages
        .map(i => {
          try {
            const url = new URL(i.image_url);
            const parts = url.pathname.split("/street-spotted/");
            return parts[1] || null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[];

      if (filePaths.length > 0) {
        await supabase.storage.from("street-spotted").remove(filePaths);
      }

      // Delete DB records
      const ids = Array.from(selected);
      // Delete related records first
      for (const id of ids) {
        await supabase.from("street_spotted_likes").delete().eq("post_id", id);
        await supabase.from("street_spotted_post_brands").delete().eq("post_id", id);
      }
      const { error } = await supabase
        .from("street_spotted_posts")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast.success(`Deleted ${selected.size} archived images`);
      fetchOldImages();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error("Failed to delete some images");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Image Archive (6+ months old)
        </CardTitle>
        <CardDescription>
          {images.length} image{images.length !== 1 ? "s" : ""} older than 6 months.
          Download and/or delete to free up storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selected.size === images.length ? "Deselect All" : "Select All"}
          </Button>
          <Button
            size="sm"
            onClick={handleBulkDownload}
            disabled={selected.size === 0 || downloading}
            className="gap-1.5"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download ZIP ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={selected.size === 0 || deleting}
            className="gap-1.5"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete ({selected.size})
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchOldImages} className="ml-auto gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No images older than 6 months 🎉</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map(img => (
              <div
                key={img.id}
                className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                  selected.has(img.id) ? "ring-2 ring-primary border-primary" : "border-border hover:border-muted-foreground/50"
                }`}
                onClick={() => toggleSelect(img.id)}
              >
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selected.has(img.id)}
                    onCheckedChange={() => toggleSelect(img.id)}
                    className="bg-background/80"
                  />
                </div>
                <img
                  src={img.image_url}
                  alt={img.caption || "Archived"}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="p-2 bg-card">
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(img.created_at), "MMM d, yyyy")}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant={img.status === "approved" ? "default" : "secondary"} className="text-[9px] px-1 py-0">
                      {img.status}
                    </Badge>
                    {img.city && <span className="text-[9px] text-muted-foreground truncate">{img.city}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
