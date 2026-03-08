import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { postId, imageUrl } = await req.json();
    if (!postId || !imageUrl) {
      return new Response(JSON.stringify({ error: "postId and imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a fashion expert AI. Analyze the outfit in this photo and identify each visible clothing item and accessory. For each item, determine:
- category: one of "hat", "cap", "top", "jacket", "hoodie", "trousers", "shorts", "shoes", "sneakers", "bag", "scarf", "sunglasses", "watch", "jewelry", "other"
- brand: the brand name (e.g. "Nike", "Supreme", "Off-White"). If uncertain, give your best guess.
- model: the specific model name if recognizable (e.g. "Air Force 1 '07", "Box Logo Hoodie"). If unknown, describe briefly (e.g. "Black puffer jacket").
- confidence: a number 0-1 representing how confident you are in the brand+model identification.

Only return items where you can at least identify the category. Be as specific as possible with brand and model names.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this outfit photo and identify all clothing items and accessories with their brands and models." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_detected_items",
              description: "Report all detected clothing items and accessories from the photo.",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["hat", "cap", "top", "jacket", "hoodie", "trousers", "shorts", "shoes", "sneakers", "bag", "scarf", "sunglasses", "watch", "jewelry", "other"],
                        },
                        brand: { type: "string" },
                        model: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["category", "brand", "model", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_detected_items" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed, please top up" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let detectedItems: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      // Filter by 75% confidence threshold
      detectedItems = (parsed.items || []).filter((item: any) => item.confidence >= 0.75);
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("street_spotted_posts")
      .update({ detected_items: detectedItems })
      .eq("id", postId);

    if (updateError) {
      console.error("Error saving detected items:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ items: detectedItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-outfit-items error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
