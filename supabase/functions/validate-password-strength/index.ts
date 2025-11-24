import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({
          valid: false,
          breached: false,
          strengthChecks,
          message: 'Password does not meet strength requirements'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.error('Failed to check password breach status');
      // If API fails, allow the password but log the issue
      return new Response(
        JSON.stringify({
          valid: true,
          breached: false,
          strengthChecks,
          message: 'Password validated (breach check unavailable)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await response.text();
    const hashes = text.split('\n');
    const breached = hashes.some(line => line.startsWith(suffix));

    console.log(`Password breach check result: ${breached ? 'BREACHED' : 'SAFE'}`);

    return new Response(
      JSON.stringify({
        valid: !breached && isStrong,
        breached,
        strengthChecks,
        message: breached 
          ? 'This password has been exposed in a data breach and cannot be used'
          : 'Password is valid and secure'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating password:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
