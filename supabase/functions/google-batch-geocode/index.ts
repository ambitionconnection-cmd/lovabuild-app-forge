import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function countSignificantDecimals(num: number): number {
  const str = String(num)
  const dotIndex = str.indexOf('.')
  if (dotIndex === -1) return 0
  const decimals = str.slice(dotIndex + 1)
  const trimmed = decimals.replace(/0+$/, '')
  return trimmed.length
}

async function googleGeocode(
  address: string,
  city: string,
  country: string,
  apiKey: string
): Promise<{ lat: number; lng: number; precision: number; type: string } | null> {
  const fullAddress = `${address}, ${city}, ${country}`
  const encodedAddress = encodeURIComponent(fullAddress)

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    )

    if (!response.ok) {
      console.error(`Google geocoding failed for ${fullAddress}: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error(`No Google results for ${fullAddress}: ${data.status}`)
      return null
    }

    const result = data.results[0]
    const lat = result.geometry.location.lat
    const lng = result.geometry.location.lng
    const locationType = result.geometry.location_type || 'UNKNOWN'
    const latPrecision = countSignificantDecimals(lat)
    const lngPrecision = countSignificantDecimals(lng)
    const precision = Math.min(latPrecision, lngPrecision)

    return { lat, lng, precision, type: locationType }
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

    // Allow service role key directly
    const token = authHeader.replace('Bearer ', '')
    const isServiceRole = token === supabaseServiceKey

    if (!isServiceRole) {
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
    }

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!googleApiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse optional body params
    let dryRun = false
    try {
      const body = await req.json()
      dryRun = body?.dry_run === true
    } catch { /* no body is fine */ }

    // Fetch all active shops with coordinates
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

    // Filter to low-precision shops (≤5 significant decimals)
    const lowPrecisionShops = shops.filter(shop => {
      const latPrec = countSignificantDecimals(Number(shop.latitude))
      const lngPrec = countSignificantDecimals(Number(shop.longitude))
      return latPrec <= 5 || lngPrec <= 5
    })

    console.log(`Found ${lowPrecisionShops.length} low-precision shops out of ${shops.length} total`)

    const results: Array<{
      name: string
      city: string
      country: string
      status: string
      old_lat: number
      old_lng: number
      new_lat?: number
      new_lng?: number
      old_precision: number
      new_precision?: number
      google_type?: string
    }> = []

    let updated = 0
    let skipped = 0
    let failed = 0
    let improved_but_dry = 0

    for (const shop of lowPrecisionShops) {
      const oldLat = Number(shop.latitude)
      const oldLng = Number(shop.longitude)
      const oldLatPrec = countSignificantDecimals(oldLat)
      const oldLngPrec = countSignificantDecimals(oldLng)
      const oldPrecision = Math.min(oldLatPrec, oldLngPrec)

      const result = await googleGeocode(shop.address, shop.city, shop.country, googleApiKey)

      if (!result) {
        results.push({
          name: shop.name, city: shop.city, country: shop.country,
          status: 'geocode_failed', old_lat: oldLat, old_lng: oldLng, old_precision: oldPrecision,
        })
        failed++
        await new Promise(r => setTimeout(r, 100))
        continue
      }

      if (result.precision > oldPrecision) {
        if (dryRun) {
          results.push({
            name: shop.name, city: shop.city, country: shop.country,
            status: 'would_update',
            old_lat: oldLat, old_lng: oldLng, old_precision: oldPrecision,
            new_lat: result.lat, new_lng: result.lng, new_precision: result.precision,
            google_type: result.type,
          })
          improved_but_dry++
        } else {
          const { error: updateError } = await supabase
            .from('shops')
            .update({ latitude: result.lat, longitude: result.lng })
            .eq('id', shop.id)

          if (updateError) {
            results.push({
              name: shop.name, city: shop.city, country: shop.country,
              status: 'update_failed',
              old_lat: oldLat, old_lng: oldLng, old_precision: oldPrecision,
              new_lat: result.lat, new_lng: result.lng, new_precision: result.precision,
              google_type: result.type,
            })
            failed++
          } else {
            results.push({
              name: shop.name, city: shop.city, country: shop.country,
              status: 'updated',
              old_lat: oldLat, old_lng: oldLng, old_precision: oldPrecision,
              new_lat: result.lat, new_lng: result.lng, new_precision: result.precision,
              google_type: result.type,
            })
            updated++
          }
        }
      } else {
        results.push({
          name: shop.name, city: shop.city, country: shop.country,
          status: 'skipped_no_improvement',
          old_lat: oldLat, old_lng: oldLng, old_precision: oldPrecision,
          new_lat: result.lat, new_lng: result.lng, new_precision: result.precision,
          google_type: result.type,
        })
        skipped++
      }

      // 100ms delay to stay within Google rate limits
      await new Promise(r => setTimeout(r, 100))
    }

    return new Response(
      JSON.stringify({
        dry_run: dryRun,
        summary: {
          total_shops: shops.length,
          total_low_precision: lowPrecisionShops.length,
          updated,
          skipped,
          failed,
          ...(dryRun ? { would_update: improved_but_dry } : {}),
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
