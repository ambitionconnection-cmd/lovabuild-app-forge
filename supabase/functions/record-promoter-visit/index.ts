// Records a promoter visit with hashed IP for fraud-resistant deduplication.
// Public endpoint (no auth required) — anonymous visitors hit this.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IP_SALT = Deno.env.get("PROMOTER_IP_SALT") || "flyaf-promoter-salt-v1";

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${IP_SALT}:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, session_id, action, elapsed_ms, user_id } = await req.json();

    if (!code || !session_id) {
      return new Response(JSON.stringify({ error: "code and session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find the promoter
    const { data: promoter, error: pErr } = await supabase
      .from("promoters").select("id, active").ilike("code", code).maybeSingle();

    if (pErr || !promoter || !promoter.active) {
      return new Response(JSON.stringify({ error: "promoter not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipHash = await hashIp(getClientIp(req));
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Look for existing visit in last 24h by session_id OR ip_hash
    const { data: existing } = await supabase
      .from("promoter_visits")
      .select("id, qualified, signed_in")
      .eq("promoter_id", promoter.id)
      .or(`session_id.eq.${session_id},ip_hash.eq.${ipHash}`)
      .gte("visited_at", since)
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ACTION: initial visit
    if (action === "visit") {
      if (existing) {
        // Update last_seen-style touch (no extra row)
        return new Response(JSON.stringify({ visit_id: existing.id, deduped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: inserted, error: iErr } = await supabase
        .from("promoter_visits")
        .insert({
          promoter_id: promoter.id,
          session_id,
          ip_hash: ipHash,
        })
        .select("id").single();
      if (iErr) throw iErr;
      return new Response(JSON.stringify({ visit_id: inserted.id, deduped: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: qualify (called when 30s+ elapsed, or on unload via beacon)
    if (action === "qualify") {
      if (!existing) return new Response(JSON.stringify({ ok: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      if ((elapsed_ms ?? 0) >= 30000 && !existing.qualified) {
        await supabase.from("promoter_visits")
          .update({ qualified: true })
          .eq("id", existing.id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: credit sign-in (called after successful auth from /ref landing)
    if (action === "signin" && user_id) {
      // Determine post-campaign window
      const { data: campaign } = await supabase
        .from("promoter_campaigns")
        .select("end_date")
        .eq("promoter_id", promoter.id)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      let postCampaign = false;
      if (campaign?.end_date) {
        const end = new Date(campaign.end_date);
        const now = new Date();
        const sevenDaysAfter = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000);
        postCampaign = now > end && now <= sevenDaysAfter;
      }

      if (existing) {
        await supabase.from("promoter_visits")
          .update({
            signed_in: true,
            user_id,
            signed_in_at: new Date().toISOString(),
            post_campaign: postCampaign,
          })
          .eq("id", existing.id);
        return new Response(JSON.stringify({ ok: true, visit_id: existing.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // No prior visit row: create one as signed_in (logged-in user landed directly)
      const { data: inserted } = await supabase
        .from("promoter_visits")
        .insert({
          promoter_id: promoter.id,
          session_id,
          ip_hash: ipHash,
          qualified: true,
          signed_in: true,
          user_id,
          signed_in_at: new Date().toISOString(),
          post_campaign: postCampaign,
        })
        .select("id").single();
      return new Response(JSON.stringify({ ok: true, visit_id: inserted?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("record-promoter-visit error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
