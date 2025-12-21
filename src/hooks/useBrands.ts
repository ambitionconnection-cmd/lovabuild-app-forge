import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Brand = Tables<"brands">;

interface UseBrandsOptions {
  activeOnly?: boolean;
  limit?: number;
}

export function useBrands(options: UseBrandsOptions = {}) {
  const { activeOnly = true, limit } = options;

  return useQuery({
    queryKey: ["brands", { activeOnly, limit }],
    queryFn: async (): Promise<Brand[]> => {
      let query = supabase.from("brands").select("*").order("name");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBrand(slug: string | undefined) {
  return useQuery({
    queryKey: ["brand", slug],
    queryFn: async (): Promise<Brand | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
