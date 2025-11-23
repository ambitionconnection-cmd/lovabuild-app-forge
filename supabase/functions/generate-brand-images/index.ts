import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName, brandCategory, brandCountry } = await req.json();

    if (!brandName) {
      throw new Error('Brand name is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate logo
    const logoPrompt = `Create a minimalist, modern logo for the streetwear/fashion brand "${brandName}". The logo should be clean, iconic, and suitable for a ${brandCategory || 'streetwear'} brand from ${brandCountry || 'international'}. Use a simple design with bold typography or abstract symbol. Professional, high-quality, transparent or white background.`;

    const logoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: logoPrompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    const logoData = await logoResponse.json();
    const logoBase64 = logoData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!logoBase64) {
      throw new Error('Failed to generate logo');
    }

    // Generate banner
    const bannerPrompt = `Create a stylish, modern banner image for the ${brandCategory || 'streetwear'} brand "${brandName}" from ${brandCountry || 'international'}. The banner should feature abstract geometric patterns, urban aesthetic, modern typography elements, or fashion-related visual elements. Use a color palette that reflects ${brandCategory || 'streetwear'} culture. Aspect ratio 16:4, high quality, professional design.`;

    const bannerResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: bannerPrompt
          }
        ],
        modalities: ['image', 'text']
      })
    });

    const bannerData = await bannerResponse.json();
    const bannerBase64 = bannerData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!bannerBase64) {
      throw new Error('Failed to generate banner');
    }

    // Convert base64 to blob and upload to storage
    const logoBlob = await fetch(logoBase64).then(r => r.blob());
    const bannerBlob = await fetch(bannerBase64).then(r => r.blob());

    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Upload logo
    const { data: logoUpload, error: logoError } = await supabase.storage
      .from('brand-images')
      .upload(`logos/${brandSlug}-logo.png`, logoBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (logoError) throw logoError;

    // Upload banner
    const { data: bannerUpload, error: bannerError } = await supabase.storage
      .from('brand-images')
      .upload(`banners/${brandSlug}-banner.png`, bannerBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (bannerError) throw bannerError;

    // Get public URLs
    const { data: { publicUrl: logoUrl } } = supabase.storage
      .from('brand-images')
      .getPublicUrl(`logos/${brandSlug}-logo.png`);

    const { data: { publicUrl: bannerUrl } } = supabase.storage
      .from('brand-images')
      .getPublicUrl(`banners/${brandSlug}-banner.png`);

    return new Response(
      JSON.stringify({ 
        logoUrl,
        bannerUrl,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});