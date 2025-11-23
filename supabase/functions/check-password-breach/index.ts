import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckPasswordRequest {
  password: string;
}

async function checkPasswordBreach(password: string): Promise<boolean> {
  try {
    // Hash the password using SHA-1
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Use k-anonymity: only send first 5 characters of hash
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    console.log('Checking password breach with hash prefix:', prefix);
    
    // Query Have I Been Pwned API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'Lovable-HEARDROP-App',
      },
    });
    
    if (!response.ok) {
      console.error('HIBP API error:', response.status);
      // If API fails, allow the password (fail open for better UX)
      return false;
    }
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    // Check if our hash suffix appears in the results
    for (const line of hashes) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix === suffix) {
        console.log('Password found in breach database');
        return true;
      }
    }
    
    console.log('Password not found in breach database');
    return false;
  } catch (error) {
    console.error('Error checking password breach:', error);
    // Fail open - if check fails, allow password
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password }: CheckPasswordRequest = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isBreached = await checkPasswordBreach(password);

    return new Response(
      JSON.stringify({ isBreached }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-password-breach function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
