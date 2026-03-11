import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeocodingResult {
  features: Array<{
    center: [number, number]
    place_name: string
    relevance: number
  }>
}

function countSignificantDecimals(num: number): number {
  const str = String(num)
  const dotIndex = str.indexOf('.')
  if (dotIndex === -1) return 0
  const decimals = str.slice(dotIndex + 1)
  // Count digits before trailing zeros
  const trimmed = decimals.replace(/0+$/, '')
  return trimmed.length
}

async function geocodeAddress(
  address: string,
  city: string,
  country: string,
  mapboxToken: string
): Promise<{ lat: number; lng: number; precision: number } | null> {
  const fullAddress = `${address}, ${city}, ${country}`
  const encodedAddress = encodeURIComponent(fullAddress)

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1&types=address,poi`
    )

    if (!response.ok) {
      console.error(`Geocoding failed for ${fullAddress}: ${response.status}`)
      return null
    }

    const data: GeocodingResult = await response.json()

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      const latPrecision = countSignificantDecimals(lat)
      const lngPrecision = countSignificantDecimals(lng)
      const precision = Math.min(latPrecision, lngPrecision)
      return { lat, lng, precision }
    }

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleData } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN')
    if (!mapboxToken) {
      throw new Error('MAPBOX_PUBLIC_TOKEN not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find shops with padded coordinates (trailing zeros = low precision)
    const { data: shops, error: fetchError } = await supabase
      .from('shops')
      .select('id, name, address, city, country, latitude, longitude')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (fetchError) throw new Error(`Failed to fetch shops: ${fetchError.message}`)
    if (!shops || shops.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No shops found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter to only low-precision shops (5 or fewer significant decimals)
    const lowPrecisionShops = shops.filter(shop => {
      const latPrec = countSignificantDecimals(Number(shop.latitude))
      const lngPrec = countSignificantDecimals(Number(shop.longitude))
      return latPrec <= 5 || lngPrec <= 5
    })

    console.log(`Found ${lowPrecisionShops.length} low-precision shops out of ${shops.length} total`)

    const results: Array<{
      name: string
      city: string
      status: string
      old_lat: number
      old_lng: number
      new_lat?: number
      new_lng?: number
      old_precision: number
      new_precision?: number
    }> = []

    let updated = 0
    let skipped = 0
    let failed = 0

    for (const shop of lowPrecisionShops) {
      const oldLat = Number(shop.latitude)
      const oldLng = Number(shop.longitude)
      const oldLatPrec = countSignificantDecimals(oldLat)
      const oldLngPrec = countSignificantDecimals(oldLng)
      const oldPrecision = Math.min(oldLatPrec, oldLngPrec)

      const result = await geocodeAddress(shop.address, shop.city, shop.country, mapboxToken)

      if (!result) {
        results.push({
          name: shop.name,
          city: shop.city,
          status: 'geocode_failed',
          old_lat: oldLat,
          old_lng: oldLng,
          old_precision: oldPrecision,
        })
        failed++
        await new Promise(r => setTimeout(r, 200))
        continue
      }

      // Only update if new precision is better
      if (result.precision > oldPrecision) {
        const { error: updateError } = await supabase
          .from('shops')
          .update({ latitude: result.lat, longitude: result.lng })
          .eq('id', shop.id)

        if (updateError) {
          results.push({
            name: shop.name,
            city: shop.city,
            status: 'update_failed',
            old_lat: oldLat,
            old_lng: oldLng,
            old_precision: oldPrecision,
            new_lat: result.lat,
            new_lng: result.lng,
            new_precision: result.precision,
          })
          failed++
        } else {
          results.push({
            name: shop.name,
            city: shop.city,
            status: 'updated',
            old_lat: oldLat,
            old_lng: oldLng,
            old_precision: oldPrecision,
            new_lat: result.lat,
            new_lng: result.lng,
            new_precision: result.precision,
          })
          updated++
        }
      } else {
        results.push({
          name: shop.name,
          city: shop.city,
          status: 'skipped_no_improvement',
          old_lat: oldLat,
          old_lng: oldLng,
          old_precision: oldPrecision,
          new_lat: result.lat,
          new_lng: result.lng,
          new_precision: result.precision,
        })
        skipped++
      }

      await new Promise(r => setTimeout(r, 200))
    }

    return new Response(
      JSON.stringify({
        summary: {
          total_low_precision: lowPrecisionShops.length,
          updated,
          skipped,
          failed,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
