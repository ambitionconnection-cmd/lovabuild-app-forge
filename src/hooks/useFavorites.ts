import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import haptic from "@/lib/haptics";
import { useNavigate } from "react-router-dom";

type FavoriteType = "brand" | "shop";

export function useFavorites(type: FavoriteType) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites(new Set());
      setLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      if (type === "brand") {
        const { data, error } = await supabase
          .from("user_favorite_brands")
          .select("brand_id")
          .eq("user_id", user.id);

        if (error) throw error;
        const ids = data?.map((item) => item.brand_id) || [];
        setFavorites(new Set(ids));
      } else {
        const { data, error } = await supabase
          .from("user_favorite_shops")
          .select("shop_id")
          .eq("user_id", user.id);

        if (error) throw error;
        const ids = data?.map((item) => item.shop_id) || [];
        setFavorites(new Set(ids));
      }
    } catch (error) {
      console.error(`Error fetching ${type} favorites:`, error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!user) {
        haptic.warning();
        toast.error(`Please sign in to favorite ${type}s`);
        navigate("/auth");
        return;
      }

      const isFav = favorites.has(id);

      try {
        if (type === "brand") {
          if (isFav) {
            const { error } = await supabase
              .from("user_favorite_brands")
              .delete()
              .eq("user_id", user.id)
              .eq("brand_id", id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("user_favorite_brands")
              .insert({ user_id: user.id, brand_id: id });
            if (error) throw error;
          }
        } else {
          if (isFav) {
            const { error } = await supabase
              .from("user_favorite_shops")
              .delete()
              .eq("user_id", user.id)
              .eq("shop_id", id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("user_favorite_shops")
              .insert({ user_id: user.id, shop_id: id });
            if (error) throw error;
          }
        }

        if (isFav) {
          setFavorites((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          haptic.light();
          toast.success("Removed from favorites");
        } else {
          setFavorites((prev) => new Set(prev).add(id));
          haptic.success();
          toast.success("Added to favorites");
        }
      } catch (error) {
        console.error(`Error toggling ${type} favorite:`, error);
        haptic.error();
        toast.error(`Failed to update favorite`);
      }
    },
    [user, favorites, type, navigate]
  );

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites]
  );

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
