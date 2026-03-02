import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface BrandRadarItem {
  brand_id: string;
  title: string;
  summary: string;
  source_url: string;
  thumbnail_url: string | null;
  source_name: string;
  published_at: string;
}

async function fetchBrandNews(
  brandName: string,
  brandId: string,
  apiKey: string
): Promise<BrandRadarItem[]> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `You are a streetwear and fashion news researcher. Find 2-3 real, recent news items about the brand "${brandName}" from the past 7 days (today is ${today}).

For each item, provide:
- title: The headline (max 100 chars)
- summary: A 1-2 sentence summary (max 200 chars)
- source_url: The actual URL of the article/post (must be a real, working URL)
- source_name: The publication name (e.g. Hypebeast, Highsnobiety, Complex)
- published_at: ISO date string of when it was published

Return ONLY a JSON array. If you cannot find any real recent news, return an empty array [].
Do NOT make up fake articles or URLs. Only include items you are confident are real.

JSON format:
[{"title":"...","summary":"...","source_url":"https://...","source_name":"...","published_at":"2025-..."}]`;

  try {
    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`AI API error for ${brandName}: ${response.status} - ${errBody.slice(0, 200)}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`AI response for ${brandName}: ${content.slice(0, 300)}`);

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`No JSON array found for ${brandName}`);
      return [];
    }

    const items: any[] = JSON.parse(jsonMatch[0]);

    return items
      .filter(
        (item: any) =>
          item.title &&
          item.source_url &&
          item.source_url.startsWith("http")
      )
      .map((item: any) => ({
        brand_id: brandId,
        title: item.title.slice(0, 200),
        summary: (item.summary || "").slice(0, 500),
        source_url: item.source_url,
        thumbnail_url: null,
        source_name: item.source_name || "Web",
        published_at: item.published_at || new Date().toISOString(),
      }));
  } catch (err) {
    console.error(`Error fetching news for ${brandName}:`, err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional limit from request body
    let brandLimit: number | null = null;
    try {
      const body = await req.json();
      if (body?.limit) brandLimit = Number(body.limit);
    } catch { /* no body */ }

    // Get popular brands (most favorited first)
    const maxBrands = brandLimit || 30;

    const { data: favoritedBrands, error: favError } = await supabase
      .rpc("get_popular_brands_for_radar", { brand_limit: maxBrands });

    if (favError) {
      console.error("Error fetching popular brands, falling back:", favError);
    }

    let brands: { id: string; name: string }[] = favoritedBrands || [];

    // Fallback: if fewer than 10 favorited brands, pad with popular streetwear defaults
    if (brands.length < 10) {
      const fallbackNames = [
        "Supreme", "Nike", "Palace", "Stüssy", "Carhartt WIP",
        "The North Face", "adidas", "New Balance", "BAPE", "Off-White",
        "Jordan Brand", "Stone Island", "Corteiz", "Trapstar", "Kith"
      ];

      const { data: fallbackBrands } = await supabase
        .from("brands")
        .select("id, name")
        .eq("is_active", true)
        .in("name", fallbackNames);

      if (fallbackBrands) {
        const existingIds = new Set(brands.map(b => b.id));
        for (const fb of fallbackBrands) {
          if (!existingIds.has(fb.id) && brands.length < maxBrands) {
            brands.push(fb);
            existingIds.add(fb.id);
          }
        }
      }
    }

    if (brands.length === 0) {
      console.log("No brands to process.");
      return new Response(
        JSON.stringify({ success: true, brands_processed: 0, items_inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${brands.length} brands...`);

    // Process brands in batches of 5 to avoid rate limits
    const batchSize = 5;
    let totalInserted = 0;

    for (let i = 0; i < brands.length; i += batchSize) {
      const batch = brands.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map((brand) =>
          fetchBrandNews(brand.name, brand.id, LOVABLE_API_KEY)
        )
      );

      const allItems = results.flat();

      if (allItems.length > 0) {
        // Upsert with source_url as unique key (ignore conflicts)
        const { error: insertError, data: inserted } = await supabase
          .from("brand_radar_items")
          .upsert(allItems, { onConflict: "source_url", ignoreDuplicates: true })
          .select("id");

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          totalInserted += inserted?.length || 0;
        }
      }

      // Small delay between batches
      if (i + batchSize < brands.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Clean up items older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: cleanupError } = await supabase
      .from("brand_radar_items")
      .delete()
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }

    console.log(
      `Done. Inserted ${totalInserted} new items from ${brands.length} brands.`
    );

    return new Response(
      JSON.stringify({
        success: true,
        brands_processed: brands.length,
        items_inserted: totalInserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("brand-radar-fetch error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
