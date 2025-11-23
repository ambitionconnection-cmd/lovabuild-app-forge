import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { action, success } = await req.json();

    console.log(`IP rate limit action: ${action} for IP: ${ipAddress}`);

    if (action === 'check') {
      // Check if IP is currently locked
      const { data: ipAttempt } = await supabaseAdmin
        .from('ip_login_attempts')
        .select('*')
        .eq('ip_address', ipAddress)
        .maybeSingle();

      if (ipAttempt?.locked_until && new Date(ipAttempt.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(ipAttempt.locked_until).getTime() - Date.now()) / 60000);
        return new Response(
          JSON.stringify({ 
            blocked: true, 
            remainingMinutes,
            message: `Too many failed attempts from your IP. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'record') {
      // Record login attempt
      const { data: ipAttempt } = await supabaseAdmin
        .from('ip_login_attempts')
        .select('*')
        .eq('ip_address', ipAddress)
        .maybeSingle();

      if (success) {
        // Successful login - reset attempts
        if (ipAttempt) {
          await supabaseAdmin
            .from('ip_login_attempts')
            .delete()
            .eq('ip_address', ipAddress);
        }
      } else {
        // Failed login - increment attempts
        const currentAttempts = (ipAttempt?.attempts || 0) + 1;
        const shouldLock = currentAttempts >= 10; // Lock after 10 failed attempts from same IP

        if (ipAttempt) {
          await supabaseAdmin
            .from('ip_login_attempts')
            .update({
              attempts: currentAttempts,
              locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null, // 30 minute lock
              last_attempt: new Date().toISOString()
            })
            .eq('ip_address', ipAddress);
        } else {
          await supabaseAdmin
            .from('ip_login_attempts')
            .insert({
              ip_address: ipAddress,
              attempts: currentAttempts,
              locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
            });
        }

        console.log(`IP ${ipAddress}: ${currentAttempts} failed attempts${shouldLock ? ' - LOCKED' : ''}`);

        // Log IP lockout event
        if (shouldLock) {
          await supabaseAdmin
            .from('security_audit_log')
            .insert({
              event_type: 'ip_locked',
              ip_address: ipAddress,
              event_data: { attempts: currentAttempts, lockDuration: 30 }
            });
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ip-rate-limit function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});