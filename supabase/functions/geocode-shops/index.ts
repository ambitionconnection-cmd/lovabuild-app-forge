import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Shop {
  id: string
  name: string
  address: string
  city: string
  country: string
}

interface GeocodingResult {
  features: Array<{
    center: [number, number] // [longitude, latitude]
    place_name: string
  }>
}

async function geocodeAddress(address: string, city: string, country: string, mapboxToken: string): Promise<{ lat: number; lng: number } | null> {
  const fullAddress = `${address}, ${city}, ${country}`
  const encodedAddress = encodeURIComponent(fullAddress)
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`
    )
    
    if (!response.ok) {
      console.error(`Geocoding failed for ${fullAddress}: ${response.status}`)
      return null
    }
    
    const data: GeocodingResult = await response.json()
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      console.log(`Geocoded ${fullAddress} -> lat: ${lat}, lng: ${lng}`)
      return { lat, lng }
    }
    
    console.warn(`No results for ${fullAddress}`)
    return null
  } catch (error) {
    console.error(`Error geocoding ${fullAddress}:`, error)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify authorization header exists
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create client with user's auth to verify admin role
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      console.log(`Access denied for user ${user.id} - not an admin`)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${user.id} authorized for geocoding`)

    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN')
    if (!mapboxToken) {
      throw new Error('MAPBOX_PUBLIC_TOKEN not configured')
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all shops without coordinates
    const { data: shops, error: fetchError } = await supabase
      .from('shops')
      .select('id, name, address, city, country')
      .or('latitude.is.null,longitude.is.null')

    if (fetchError) {
      throw new Error(`Failed to fetch shops: ${fetchError.message}`)
    }

    if (!shops || shops.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All shops already have coordinates', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${shops.length} shops to geocode`)

    let updated = 0
    const failed: string[] = []

    // Process shops with a small delay to avoid rate limiting
    for (const shop of shops) {
      const coords = await geocodeAddress(shop.address, shop.city, shop.country, mapboxToken)
      
      if (coords) {
        const { error: updateError } = await supabase
          .from('shops')
          .update({ latitude: coords.lat, longitude: coords.lng })
          .eq('id', shop.id)

        if (updateError) {
          console.error(`Failed to update ${shop.name}: ${updateError.message}`)
          failed.push(shop.name)
        } else {
          updated++
          console.log(`Updated ${shop.name}`)
        }
      } else {
        failed.push(shop.name)
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return new Response(
      JSON.stringify({ 
        message: `Geocoding complete`,
        total: shops.length,
        updated,
        failed: failed.length,
        failedShops: failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
