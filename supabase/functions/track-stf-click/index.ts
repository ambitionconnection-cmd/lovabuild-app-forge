import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_type, platform, post_id, item_brand, item_model, item_category } = await req.json();

    if (event_type !== "shop_this_fit_click" || !post_id || !platform) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip_address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const user_agent = req.headers.get("user-agent") || null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("shop_this_fit_clicks").insert({
      post_id,
      platform,
      item_brand: item_brand || "Unknown",
      item_model: item_model || "Unknown",
      item_category: item_category || "other",
      ip_address,
      user_agent,
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to track" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-stf-click error:", e);
    return new Response(JSON.stringify({ error: "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
