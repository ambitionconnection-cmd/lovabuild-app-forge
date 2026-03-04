import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active admin notification preferences
    const { data: adminPrefs, error: prefsError } = await supabase
      .from("admin_notification_preferences")
      .select("*")
      .eq("is_active", true);

    if (prefsError) throw prefsError;
    if (!adminPrefs || adminPrefs.length === 0) {
      return new Response(JSON.stringify({ message: "No active notification preferences" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for pending items
    const [contactsRes, postsRes, brandReqRes] = await Promise.all([
      supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("is_resolved", false),
      supabase.from("street_spotted_posts").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("brand_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const counts = {
      contacts: contactsRes.count || 0,
      posts: postsRes.count || 0,
      brandRequests: brandReqRes.count || 0,
    };

    // Send emails to each admin based on their preferences
    const results = [];
    for (const pref of adminPrefs) {
      const items: string[] = [];
      if (pref.notify_contact_messages && counts.contacts > 0) {
        items.push(`📩 ${counts.contacts} unread contact message${counts.contacts > 1 ? "s" : ""}`);
      }
      if (pref.notify_pending_posts && counts.posts > 0) {
        items.push(`📸 ${counts.posts} post${counts.posts > 1 ? "s" : ""} pending approval`);
      }
      if (pref.notify_brand_requests && counts.brandRequests > 0) {
        items.push(`🏷️ ${counts.brandRequests} brand request${counts.brandRequests > 1 ? "s" : ""}`);
      }

      if (items.length === 0) continue;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #C4956A;">HEARDROP Admin Alert</h2>
          <p>The following items need your attention:</p>
          <ul style="list-style: none; padding: 0;">
            ${items.map((item) => `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${item}</li>`).join("")}
          </ul>
          <p style="margin-top: 20px;">
            <a href="https://lovabuild-app-forge.lovable.app/admin" 
               style="background: #C4956A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              Open Admin Dashboard
            </a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            You can manage these notifications in Admin → Communications → Email Notifications.
          </p>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HEARDROP <onboarding@resend.dev>",
          to: [pref.email],
          subject: `[HEARDROP] ${items.length} item${items.length > 1 ? "s" : ""} need${items.length === 1 ? "s" : ""} your attention`,
          html: htmlBody,
        }),
      });

      const emailData = await emailRes.json();
      results.push({ email: pref.email, success: emailRes.ok, data: emailData });
    }

    return new Response(JSON.stringify({ results, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending admin notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
