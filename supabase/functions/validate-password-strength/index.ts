import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 password checks per minute per IP

// In-memory rate limiting (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    // New window
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
}

function getClientIP(req: Request): string {
  // Check multiple headers for the real IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      
      // Log to security audit
      await supabase.from('security_audit_log').insert({
        event_type: 'password_validation_rate_limit',
        ip_address: clientIP,
        event_data: {
          reason: 'Too many password validation attempts',
          max_requests: MAX_REQUESTS_PER_WINDOW,
          window_seconds: RATE_LIMIT_WINDOW / 1000
        }
      });

      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0'
          } 
        }
      );
    }

    const { password } = await req.json();

    console.log(`Password validation request from IP: ${clientIP}, Remaining: ${rateLimit.remaining}`);

    if (!password) {
      console.warn(`Missing password in request from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          } 
        }
      );
    }

    // Check for suspicious patterns (extremely short or long passwords)
    if (password.length < 1 || password.length > 256) {
      console.warn(`Suspicious password length (${password.length}) from IP: ${clientIP}`);
      
      await supabase.from('security_audit_log').insert({
        event_type: 'password_validation_suspicious',
        ip_address: clientIP,
        event_data: {
          reason: 'Invalid password length',
          length: password.length
        }
      });

      return new Response(
        JSON.stringify({
          valid: false,
          breached: false,
          strengthChecks: {},
          message: 'Invalid password length'
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          } 
        }
      );
    }

    // Check password strength
    const strengthChecks = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const isStrong = Object.values(strengthChecks).every(check => check);

    if (!isStrong) {
      console.log(`Weak password rejected for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          valid: false,
          breached: false,
          strengthChecks,
          message: 'Password does not meet strength requirements'
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          } 
        }
      );
    }

    // Check against Have I Been Pwned API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    console.log(`Checking password hash prefix: ${prefix}`);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'Heardrop-Password-Validator',
      },
    });

    if (!response.ok) {
      console.error(`Failed to check password breach status: ${response.status} for IP: ${clientIP}`);
      
      // Log API failure
      await supabase.from('security_audit_log').insert({
        event_type: 'password_validation_api_error',
        ip_address: clientIP,
        event_data: {
          reason: 'Have I Been Pwned API error',
          status_code: response.status
        }
      });

      // If API fails, allow the password but log the issue
      return new Response(
        JSON.stringify({
          valid: true,
          breached: false,
          strengthChecks,
          message: 'Password validated (breach check unavailable)'
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          } 
        }
      );
    }

    const text = await response.text();
    const hashes = text.split('\n');
    const breached = hashes.some(line => line.startsWith(suffix));

    console.log(`Password breach check result: ${breached ? 'BREACHED' : 'SAFE'} for IP: ${clientIP}`);

    // Log breached password attempts for security monitoring
    if (breached) {
      await supabase.from('security_audit_log').insert({
        event_type: 'breached_password_attempt',
        ip_address: clientIP,
        event_data: {
          reason: 'User attempted to use a breached password',
          hash_prefix: prefix
        }
      });
    }

    return new Response(
      JSON.stringify({
        valid: !breached && isStrong,
        breached,
        strengthChecks,
        message: breached 
          ? 'This password has been exposed in a data breach and cannot be used'
          : 'Password is valid and secure'
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        } 
      }
    );

  } catch (error) {
    console.error(`Error validating password for IP ${clientIP}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Log unexpected errors
    try {
      await supabase.from('security_audit_log').insert({
        event_type: 'password_validation_error',
        ip_address: clientIP,
        event_data: {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    } catch (logError) {
      console.error('Failed to log error to audit table:', logError);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
