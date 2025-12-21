import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Drop = Tables<"drops">;
type DropStatus = "upcoming" | "live" | "ended";

interface UseDropsOptions {
  status?: DropStatus | DropStatus[] | "all";
  brandId?: string;
  featured?: boolean;
  limit?: number;
  orderBy?: "release_date" | "created_at";
  ascending?: boolean;
}

export function useDrops(options: UseDropsOptions = {}) {
  const {
    status = "all",
    brandId,
    featured,
    limit,
    orderBy = "release_date",
    ascending = true,
  } = options;

  return useQuery({
    queryKey: ["drops", { status, brandId, featured, limit, orderBy, ascending }],
    queryFn: async (): Promise<Drop[]> => {
      let query = supabase
        .from("drops")
        .select("*")
        .order(orderBy, { ascending });

      if (status !== "all") {
        if (Array.isArray(status)) {
          query = query.in("status", status);
        } else {
          query = query.eq("status", status);
        }
      }

      if (brandId) {
        query = query.eq("brand_id", brandId);
      }

      if (featured !== undefined) {
        query = query.eq("is_featured", featured);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFeaturedDrops(limit = 4) {
  return useQuery({
    queryKey: ["drops", "featured", limit],
    queryFn: async (): Promise<Drop[]> => {
      // Fetch upcoming/live drops first
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("drops")
        .select("*")
        .in("status", ["upcoming", "live"])
        .gte("release_date", new Date().toISOString())
        .order("release_date", { ascending: true })
        .limit(limit);

      if (upcomingError) throw upcomingError;

      let displayDrops = upcomingData || [];

      // If we don't have enough, fill with recent ended drops
      if (displayDrops.length < limit) {
        const needed = limit - displayDrops.length;
        const { data: endedData, error: endedError } = await supabase
          .from("drops")
          .select("*")
          .eq("status", "ended")
          .order("release_date", { ascending: false })
          .limit(needed);

        if (endedError) throw endedError;

        if (endedData) {
          displayDrops = [...displayDrops, ...endedData];
        }
      }

      return displayDrops;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpcomingDropsForBrand(brandId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["drops", "upcoming", brandId, limit],
    queryFn: async (): Promise<Drop[]> => {
      if (!brandId) return [];

      const { data, error } = await supabase
        .from("drops")
        .select("*")
        .eq("brand_id", brandId)
        .gte("release_date", new Date().toISOString())
        .order("release_date", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000,
  });
}
