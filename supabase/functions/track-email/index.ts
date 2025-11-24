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

// Rate limiting: max 100 requests per IP per hour
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limit tracking (resets when function cold starts)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function validateUserId(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error validating user ID:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception validating user ID:', error);
    return false;
  }
}

function checkRateLimit(ipAddress: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ipAddress);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(ip);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // Create new record or reset expired record
    rateLimitStore.set(ipAddress, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

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

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Check rate limit
    const rateLimit = checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for IP: ${ipAddress}`);
      // Return tracking pixel or redirect anyway to avoid revealing rate limiting
      // But don't record the event
      if (eventType === 'open') {
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
    }

    if (!userId) {
      console.warn('Missing user ID in tracking request');
      return new Response('Missing user ID', { status: 400, headers: corsHeaders });
    }

    if (!eventType || !['open', 'click'].includes(eventType)) {
      console.warn(`Invalid event type: ${eventType}`);
      return new Response('Invalid event type', { status: 400, headers: corsHeaders });
    }

    // Validate user ID exists
    const isValidUser = await validateUserId(userId);
    if (!isValidUser) {
      console.warn(`Invalid or non-existent user ID attempted: ${userId} from IP: ${ipAddress}`);
      
      // Log suspicious activity
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'invalid_email_tracking_attempt',
          user_id: userId,
          ip_address: ipAddress,
          event_data: { 
            email_type: emailType,
            event_type: eventType,
            user_agent: req.headers.get('user-agent')
          }
        });
      
      // Return success response to avoid revealing validation
      // But don't record the event
      if (eventType === 'open') {
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
    }

    // Track the event (only if user is valid and rate limit not exceeded)
    await trackEmailEvent(userId, emailType, eventType, {
      target_url: targetUrl || null,
      user_agent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
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
