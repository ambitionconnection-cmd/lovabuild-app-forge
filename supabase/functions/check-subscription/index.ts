import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // ── Admin bypass: admins always get Pro ──
    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRole) {
      logStep("Admin user detected — granting Pro bypass", { userId: user.id });
      await supabaseClient.from("profiles").update({
        is_pro: true,
        pro_expires_at: null,
      }).eq("id", user.id);

      return new Response(JSON.stringify({
        subscribed: true,
        product_id: "admin_bypass",
        subscription_end: null,
        is_admin: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Standard Stripe check ──
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      // Check if user has Pro via founding member or ambassador code (don't revoke)
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("is_pro, is_founding_member")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_pro && profile?.is_founding_member) {
        logStep("Founding member with active Pro — preserving");
        return new Response(JSON.stringify({ subscribed: true, product_id: "founding_member", subscription_end: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check if Pro was granted by ambassador code (pro_expires_at is null = permanent)
      if (profile?.is_pro) {
        const { data: redemption } = await supabaseClient
          .from("code_redemptions")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (redemption) {
          logStep("Ambassador code user with active Pro — preserving");
          return new Response(JSON.stringify({ subscribed: true, product_id: "ambassador", subscription_end: null }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      await supabaseClient.from("profiles").update({
        is_pro: false,
        pro_expires_at: null,
      }).eq("id", user.id);

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let productId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });

      await supabaseClient.from("profiles").update({
        is_pro: true,
        pro_expires_at: subscriptionEnd,
      }).eq("id", user.id);
    } else {
      logStep("No active subscription");

      // Don't revoke founding member or ambassador Pro
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("is_pro, is_founding_member")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_founding_member && profile?.is_pro) {
        logStep("Founding member — preserving Pro");
        return new Response(JSON.stringify({ subscribed: true, product_id: "founding_member", subscription_end: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      await supabaseClient.from("profiles").update({
        is_pro: false,
        pro_expires_at: null,
      }).eq("id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
