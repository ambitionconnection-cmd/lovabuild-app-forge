import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// Validate authorization for cron jobs
function validateCronAuthorization(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  // Accept either service role key or anon key (for cron jobs)
  return token === supabaseServiceKey || token === supabaseAnonKey;
}

// Helper function to create trackable links
function createTrackableLink(userId: string, targetUrl: string, emailType: string): string {
  const trackingUrl = new URL(`${supabaseUrl}/functions/v1/track-email`);
  trackingUrl.searchParams.set('u', userId);
  trackingUrl.searchParams.set('t', emailType);
  trackingUrl.searchParams.set('e', 'click');
  trackingUrl.searchParams.set('url', targetUrl);
  return trackingUrl.toString();
}

// Helper function to create tracking pixel URL
function createTrackingPixel(userId: string, emailType: string): string {
  const trackingUrl = new URL(`${supabaseUrl}/functions/v1/track-email`);
  trackingUrl.searchParams.set('u', userId);
  trackingUrl.searchParams.set('t', emailType);
  trackingUrl.searchParams.set('e', 'open');
  return trackingUrl.toString();
}

async function logNotification(userId: string, title: string, message: string) {
  const { error } = await supabase
    .from('notification_history')
    .insert({
      user_id: userId,
      notification_type: 'weekly_digest',
      title,
      message,
      is_read: false,
      metadata: {
        sent_at: new Date().toISOString(),
      },
    });

  if (error) {
    console.error('Error logging notification:', error);
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function getUpcomingDrops() {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: drops, error } = await supabase
    .from('drops')
    .select(`
      id,
      title,
      description,
      release_date,
      image_url,
      discount_code,
      status,
      brands (name, logo_url)
    `)
    .gte('release_date', now.toISOString())
    .lte('release_date', oneWeekFromNow.toISOString())
    .order('release_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching upcoming drops:', error);
    return [];
  }

  return drops || [];
}

async function getNewBrands() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name, description, logo_url, category')
    .gte('created_at', oneWeekAgo.toISOString())
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching new brands:', error);
    return [];
  }

  return brands || [];
}

async function getUserPersonalizedDrops(userId: string) {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get user's favorite brands
  const { data: favBrands, error: favBrandsError } = await supabase
    .from('user_favorite_brands')
    .select('brand_id')
    .eq('user_id', userId);

  if (favBrandsError) {
    console.error('Error fetching favorite brands:', favBrandsError);
    return [];
  }

  // Get user's favorite shops
  const { data: favShops, error: favShopsError } = await supabase
    .from('user_favorite_shops')
    .select('shop_id')
    .eq('user_id', userId);

  if (favShopsError) {
    console.error('Error fetching favorite shops:', favShopsError);
  }

  const favoriteBrandIds = favBrands?.map(f => f.brand_id) || [];
  const favoriteShopIds = favShops?.map(f => f.shop_id) || [];

  if (favoriteBrandIds.length === 0 && favoriteShopIds.length === 0) {
    return [];
  }

  // Fetch drops from favorite brands or shops
  let query = supabase
    .from('drops')
    .select(`
      id,
      title,
      description,
      release_date,
      image_url,
      discount_code,
      status,
      brands (name, logo_url),
      shops (name)
    `)
    .gte('release_date', now.toISOString())
    .lte('release_date', oneWeekFromNow.toISOString());

  // Filter by favorite brands or shops
  if (favoriteBrandIds.length > 0 && favoriteShopIds.length > 0) {
    query = query.or(`brand_id.in.(${favoriteBrandIds.join(',')}),shop_id.in.(${favoriteShopIds.join(',')})`);
  } else if (favoriteBrandIds.length > 0) {
    query = query.in('brand_id', favoriteBrandIds);
  } else if (favoriteShopIds.length > 0) {
    query = query.in('shop_id', favoriteShopIds);
  }

  const { data: drops, error } = await query
    .order('release_date', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error fetching personalized drops:', error);
    return [];
  }

  return drops || [];
}

async function getUserDropReminders(userId: string) {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: reminders, error } = await supabase
    .from('user_drop_reminders')
    .select(`
      id,
      created_at,
      is_notified,
      drops (
        id,
        title,
        description,
        release_date,
        image_url,
        discount_code,
        brands (name, logo_url),
        shops (name)
      )
    `)
    .eq('user_id', userId)
    .gte('drops.release_date', now.toISOString())
    .lte('drops.release_date', oneWeekFromNow.toISOString())
    .order('drops(release_date)', { ascending: true });

  if (error) {
    console.error('Error fetching user drop reminders:', error);
    return [];
  }

  // Filter out reminders where drops is null
  return (reminders || []).filter(r => r.drops !== null);
}

function generateDigestEmail(
  userId: string,
  displayName: string,
  upcomingDrops: any[],
  newBrands: any[],
  personalizedDrops: any[],
  dropReminders: any[]
): string {
  const emailType = 'weekly_digest';
  const appUrl = supabaseUrl.replace('//', '//');
  const exploreLink = createTrackableLink(userId, appUrl, emailType);
  const profileLink = createTrackableLink(userId, `${appUrl}/profile`, emailType);
  const trackingPixelUrl = createTrackingPixel(userId, emailType);
  const now = new Date();
  const weekRange = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  let dropsHtml = '';
  if (upcomingDrops.length > 0) {
    dropsHtml = upcomingDrops.map(drop => `
      <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 16px; align-items: start;">
          ${drop.image_url ? `
            <img src="${drop.image_url}" alt="${drop.title}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;" />
          ` : ''}
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0; color: #000; font-size: 18px;">${drop.title}</h3>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
              <strong>${drop.brands?.name || 'Unknown Brand'}</strong>
            </p>
            <p style="margin: 0 0 8px 0; color: #999; font-size: 13px;">
              📅 ${formatDate(drop.release_date)}
            </p>
            ${drop.description ? `
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${drop.description.substring(0, 100)}${drop.description.length > 100 ? '...' : ''}</p>
            ` : ''}
            ${drop.discount_code ? `
              <div style="background: #f0f9ff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px;">
                <span style="color: #0369a1; font-size: 12px; font-weight: 600;">💰 Code: ${drop.discount_code}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } else {
    dropsHtml = '<p style="color: #999; text-align: center; padding: 20px;">No upcoming drops this week</p>';
  }

  let brandsHtml = '';
  if (newBrands.length > 0) {
    brandsHtml = newBrands.map(brand => `
      <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 16px; align-items: start;">
          ${brand.logo_url ? `
            <img src="${brand.logo_url}" alt="${brand.name}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;" />
          ` : ''}
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0; color: #000; font-size: 16px;">${brand.name}</h3>
            ${brand.category ? `
              <span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">
                ${brand.category}
              </span>
            ` : ''}
            ${brand.description ? `
              <p style="margin: 12px 0 0 0; color: #666; font-size: 14px;">${brand.description.substring(0, 120)}${brand.description.length > 120 ? '...' : ''}</p>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } else {
    brandsHtml = '<p style="color: #999; text-align: center; padding: 20px;">No new brands this week</p>';
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">HEARDROP</h1>
            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Weekly Digest</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 20px;">
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
              Hi ${displayName || 'there'} 👋
            </p>
            <p style="margin: 0 0 30px 0; color: #666; font-size: 14px; line-height: 1.6;">
              Here's your weekly roundup of what's happening in the streetwear world for <strong>${weekRange}</strong>
            </p>

            ${dropReminders.length > 0 ? `
              <!-- Your Reminders Section -->
              <div style="margin-bottom: 40px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                  <span style="font-size: 24px;">🔔</span>
                  <h2 style="margin: 0; color: #000; font-size: 22px;">Your Upcoming Reminders</h2>
                </div>
                <p style="margin: 0 0 16px 0; color: #666; font-size: 13px;">
                  Drops you've set reminders for this week
                </p>
                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 20px; border-radius: 12px; border: 2px solid #3b82f6;">
                  ${dropReminders.map(reminder => {
                    const drop = reminder.drops;
                    return `
                      <div style="background: #fff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="display: flex; gap: 16px; align-items: start;">
                          ${drop.image_url ? `
                            <img src="${drop.image_url}" alt="${drop.title}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;" />
                          ` : ''}
                          <div style="flex: 1;">
                            <div style="background: #3b82f6; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block; margin-bottom: 8px;">
                              🔔 REMINDER SET
                            </div>
                            <h3 style="margin: 0 0 8px 0; color: #000; font-size: 18px;">${drop.title}</h3>
                            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
                              <strong>${drop.brands?.name || drop.shops?.name || 'Unknown'}</strong>
                            </p>
                            <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 13px; font-weight: 600;">
                              📅 ${formatDate(drop.release_date)}
                            </p>
                            ${drop.description ? `
                              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${drop.description.substring(0, 100)}${drop.description.length > 100 ? '...' : ''}</p>
                            ` : ''}
                            ${drop.discount_code ? `
                              <div style="background: #dbeafe; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px;">
                                <span style="color: #1e40af; font-size: 12px; font-weight: 600;">💰 Code: ${drop.discount_code}</span>
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            ${personalizedDrops.length > 0 ? `
              <!-- Personalized Section -->
              <div style="margin-bottom: 40px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                  <span style="font-size: 24px;">⭐</span>
                  <h2 style="margin: 0; color: #000; font-size: 22px;">Personalized For You</h2>
                </div>
                <p style="margin: 0 0 16px 0; color: #666; font-size: 13px;">
                  Based on your favorite brands and shops
                </p>
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; border: 2px solid #fbbf24;">
                  ${personalizedDrops.map(drop => `
                    <div style="background: #fff; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <div style="display: flex; gap: 16px; align-items: start;">
                        ${drop.image_url ? `
                          <img src="${drop.image_url}" alt="${drop.title}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;" />
                        ` : ''}
                        <div style="flex: 1;">
                          <div style="background: #fbbf24; color: #78350f; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block; margin-bottom: 8px;">
                            FROM YOUR FAVORITES
                          </div>
                          <h3 style="margin: 0 0 8px 0; color: #000; font-size: 18px;">${drop.title}</h3>
                          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
                            <strong>${drop.brands?.name || drop.shops?.name || 'Unknown'}</strong>
                          </p>
                          <p style="margin: 0 0 8px 0; color: #999; font-size: 13px;">
                            📅 ${formatDate(drop.release_date)}
                          </p>
                          ${drop.description ? `
                            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${drop.description.substring(0, 100)}${drop.description.length > 100 ? '...' : ''}</p>
                          ` : ''}
                          ${drop.discount_code ? `
                            <div style="background: #fef3c7; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px;">
                              <span style="color: #78350f; font-size: 12px; font-weight: 600;">💰 Code: ${drop.discount_code}</span>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Upcoming Drops Section -->
            <div style="margin-bottom: 40px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <span style="font-size: 24px;">🔥</span>
                <h2 style="margin: 0; color: #000; font-size: 22px;">Upcoming Drops</h2>
              </div>
              <div style="background: #f9fafb; padding: 20px; border-radius: 12px;">
                ${dropsHtml}
              </div>
            </div>

            <!-- New Brands Section -->
            <div style="margin-bottom: 40px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <span style="font-size: 24px;">✨</span>
                <h2 style="margin: 0; color: #000; font-size: 22px;">New Brands</h2>
              </div>
              <div style="background: #f9fafb; padding: 20px; border-radius: 12px;">
                ${brandsHtml}
              </div>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${exploreLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Explore More on HEARDROP
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0 0 10px 0; color: #999; font-size: 12px; line-height: 1.6;">
              You're receiving this weekly digest because you enabled it in your notification preferences.
            </p>
            <p style="margin: 0; color: #999; font-size: 12px;">
              <a href="${profileLink}" style="color: #667eea; text-decoration: none;">Manage preferences</a>
            </p>
          </div>
          
          <!-- Tracking Pixel -->
          <img src="${trackingPixelUrl}" width="1" height="1" style="display:block; border:0; outline:none;" alt="" />
        </div>
      </body>
    </html>
  `;
}

function shouldSendDigest(frequency: string | undefined, currentDate: Date): boolean {
  if (!frequency || frequency === 'weekly') {
    return true; // Send every time (weekly)
  }
  
  if (frequency === 'bi-weekly') {
    // Send every other week (check week number)
    const weekNumber = Math.floor(currentDate.getDate() / 7);
    return weekNumber % 2 === 0;
  }
  
  if (frequency === 'monthly') {
    // Send only on first Monday of the month
    const dayOfMonth = currentDate.getDate();
    return dayOfMonth <= 7; // First week of the month
  }
  
  return true; // Default to weekly if unknown frequency
}

async function sendWeeklyDigests() {
  console.log('Starting weekly digest job...');
  const currentDate = new Date();

  // Get all profiles with weekly_digest enabled
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, notification_preferences')
    .not('notification_preferences', 'is', null);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return { processed: 0, errors: 0 };
  }

  // Filter profiles with weekly_digest enabled and check frequency
  const eligibleProfiles = (profiles || []).filter(profile => {
    const prefs = profile.notification_preferences as Record<string, any> | null;
    if (!prefs?.weekly_digest) {
      return false;
    }
    
    const frequency = prefs.digest_frequency;
    const shouldSend = shouldSendDigest(frequency, currentDate);
    
    if (!shouldSend) {
      console.log(`Skipping user ${profile.id} with ${frequency} frequency`);
    }
    
    return shouldSend;
  });

  console.log(`Found ${eligibleProfiles.length} users eligible for digest this cycle`);

  if (eligibleProfiles.length === 0) {
    return { processed: 0, errors: 0 };
  }

  // Fetch data once for all users
  const upcomingDrops = await getUpcomingDrops();
  const newBrands = await getNewBrands();

  console.log(`Found ${upcomingDrops.length} upcoming drops and ${newBrands.length} new brands`);

  // Get user emails
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return { processed: 0, errors: 0 };
  }

  const userEmailMap = new Map(users.users.map(u => [u.id, u.email]));

  let processed = 0;
  let errors = 0;

  for (const profile of eligibleProfiles) {
    const userEmail = userEmailMap.get(profile.id);
    
    if (!userEmail) {
      console.log(`No email found for user ${profile.id}`);
      continue;
    }

    try {
      // Fetch personalized data for this user
      const [personalizedDrops, dropReminders] = await Promise.all([
        getUserPersonalizedDrops(profile.id),
        getUserDropReminders(profile.id)
      ]);
      
      console.log(`Found ${personalizedDrops.length} personalized drops and ${dropReminders.length} reminders for user ${profile.id}`);

      const emailHtml = generateDigestEmail(
        profile.id,
        profile.display_name,
        upcomingDrops,
        newBrands,
        personalizedDrops,
        dropReminders
      );

      const { error: sendError } = await resend.emails.send({
        from: 'HEARDROP Weekly <onboarding@resend.dev>',
        to: [userEmail],
        subject: dropReminders.length > 0 ? '🔔 Your HEARDROP Reminders & Digest' : personalizedDrops.length > 0 ? '⭐ Your Personalized HEARDROP Digest' : '🔥 Your Weekly HEARDROP Digest',
        html: emailHtml,
      });

      if (sendError) {
        console.error(`Error sending email to ${userEmail}:`, sendError);
        errors++;
        continue;
      }

      // Log notification
      await logNotification(
        profile.id,
        dropReminders.length > 0 ? 'Your HEARDROP Reminders & Digest' : personalizedDrops.length > 0 ? 'Your Personalized HEARDROP Digest' : 'Your Weekly HEARDROP Digest',
        `${dropReminders.length} reminders, ${personalizedDrops.length} personalized drops, ${upcomingDrops.length} upcoming drops, and ${newBrands.length} new brands this week`
      );

      processed++;
      console.log(`Successfully sent digest to ${userEmail}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing digest for ${userEmail}:`, errorMessage);
      errors++;
    }
  }

  return { processed, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authorization for cron jobs
  if (!validateCronAuthorization(req)) {
    console.error('Unauthorized request to send-weekly-digest');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Weekly digest function invoked');
    
    const result = await sendWeeklyDigests();

    console.log('Weekly digest complete:', result);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in weekly digest function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
