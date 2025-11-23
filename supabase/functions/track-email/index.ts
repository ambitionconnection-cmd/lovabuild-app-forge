import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 1x1 transparent GIF pixel for email open tracking
const TRACKING_PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 
  0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 
  0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
]);

async function trackEmailEvent(
  userId: string,
  emailType: string,
  eventType: 'open' | 'click',
  metadata: Record<string, any> = {}
) {
  const { error } = await supabase
    .from('email_analytics')
    .insert({
      user_id: userId,
      email_type: emailType,
      event_type: eventType,
      metadata,
    });

  if (error) {
    console.error('Error tracking email event:', error);
  } else {
    console.log(`Tracked ${eventType} for user ${userId}, email type: ${emailType}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('u');
    const emailType = url.searchParams.get('t') || 'other';
    const eventType = url.searchParams.get('e') as 'open' | 'click';
    const targetUrl = url.searchParams.get('url');

    if (!userId) {
      return new Response('Missing user ID', { status: 400, headers: corsHeaders });
    }

    if (!eventType || !['open', 'click'].includes(eventType)) {
      return new Response('Invalid event type', { status: 400, headers: corsHeaders });
    }

    // Track the event
    await trackEmailEvent(userId, emailType, eventType, {
      target_url: targetUrl || null,
      user_agent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    // Handle based on event type
    if (eventType === 'open') {
      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Expires': '0',
          ...corsHeaders,
        },
      });
    } else if (eventType === 'click' && targetUrl) {
      // Redirect to target URL
      return new Response(null, {
        status: 302,
        headers: {
          'Location': targetUrl,
          ...corsHeaders,
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in track-email function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
