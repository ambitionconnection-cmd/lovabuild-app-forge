import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogEventRequest {
  eventType: 'login_success' | 'login_failed' | 'account_locked' | 'ip_locked' | 'admin_unlock_account' | 'admin_unlock_ip';
  userEmail?: string;
  userId?: string;
  ipAddress?: string;
  eventData?: Record<string, any>;
  performedBy?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const { eventType, userEmail, userId, eventData, performedBy }: LogEventRequest = await req.json();

    console.log(`Logging security event: ${eventType} for ${userEmail || userId || 'unknown'}`);

    const { error } = await supabaseAdmin
      .from('security_audit_log')
      .insert({
        event_type: eventType,
        user_id: userId || null,
        user_email: userEmail || null,
        ip_address: ipAddress,
        event_data: eventData || {},
        performed_by: performedBy || null,
      });

    if (error) {
      console.error('Error logging security event:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-security-event function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});