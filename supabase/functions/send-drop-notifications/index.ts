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

interface NotificationLog {
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

async function logNotification(log: NotificationLog) {
  const { error } = await supabase
    .from('notification_history')
    .insert({
      user_id: log.user_id,
      notification_type: log.notification_type,
      title: log.title,
      message: log.message,
      metadata: log.metadata || {},
      is_read: false,
    });

  if (error) {
    console.error('Error logging notification:', error);
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  notificationLog: NotificationLog
) {
  try {
    const { error } = await resend.emails.send({
      from: 'HEARDROP <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    // Log to notification history
    await logNotification(notificationLog);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send email:', errorMessage);
    return false;
  }
}

async function notifyDropGoingLive() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  // Find drops going live in the next hour
  const { data: upcomingDrops, error: dropsError } = await supabase
    .from('drops')
    .select(`
      *,
      brands (name, logo_url),
      shops (name, city, country)
    `)
    .eq('status', 'upcoming')
    .gte('release_date', now.toISOString())
    .lte('release_date', oneHourFromNow.toISOString());

  if (dropsError) {
    console.error('Error fetching drops:', dropsError);
    return { processed: 0, errors: 0 };
  }

  if (!upcomingDrops || upcomingDrops.length === 0) {
    console.log('No drops going live soon');
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const drop of upcomingDrops) {
    // Get users who set reminders for this drop
    const { data: reminders, error: remindersError } = await supabase
      .from('user_drop_reminders')
      .select(`
        user_id,
        profiles!inner (
          id,
          display_name,
          notification_preferences
        )
      `)
      .eq('drop_id', drop.id)
      .eq('is_notified', false);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      errors++;
      continue;
    }

    // Get users' emails
    const userIds = reminders?.map(r => r.user_id) || [];
    if (userIds.length === 0) continue;

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      errors++;
      continue;
    }

    const userEmailMap = new Map(users.users.map(u => [u.id, u.email]));

    for (const reminder of reminders || []) {
      const profile = reminder.profiles;
      const userEmail = userEmailMap.get(reminder.user_id);
      
      if (!userEmail) continue;

      // Check notification preferences
      const prefs = profile.notification_preferences as Record<string, boolean> | null;
      if (prefs && prefs.drop_reminders === false) {
        continue;
      }

      const brandName = drop.brands?.name || 'Unknown Brand';
      const releaseDate = new Date(drop.release_date);
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🔔 Your Drop is Going Live Soon!</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #000; margin-top: 0;">${drop.title}</h3>
            <p style="color: #666; margin: 10px 0;">
              <strong>Brand:</strong> ${brandName}
            </p>
            <p style="color: #666; margin: 10px 0;">
              <strong>Release Date:</strong> ${releaseDate.toLocaleString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            ${drop.description ? `<p style="color: #666; margin: 10px 0;">${drop.description}</p>` : ''}
            ${drop.discount_code ? `
              <div style="background: #fff; padding: 15px; border-radius: 5px; margin-top: 15px;">
                <p style="margin: 0; color: #333;"><strong>💰 Discount Code:</strong></p>
                <code style="background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; font-size: 16px;">${drop.discount_code}</code>
              </div>
            ` : ''}
          </div>
          <p style="color: #666;">
            Don't miss out! This drop is going live in less than an hour.
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">
              You're receiving this email because you set a reminder for this drop on HEARDROP.<br>
              Manage your notification preferences in your profile settings.
            </p>
          </div>
        </div>
      `;

      const success = await sendEmail(
        userEmail,
        `🔔 ${drop.title} is going live soon!`,
        emailHtml,
        {
          user_id: reminder.user_id,
          notification_type: 'drop_reminder',
          title: `${drop.title} is going live soon!`,
          message: `The drop from ${brandName} is releasing on ${releaseDate.toLocaleDateString()}`,
          metadata: {
            drop_id: drop.id,
            brand_name: brandName,
            release_date: drop.release_date,
          },
        }
      );

      if (success) {
        // Mark reminder as notified
        await supabase
          .from('user_drop_reminders')
          .update({ is_notified: true })
          .eq('user_id', reminder.user_id)
          .eq('drop_id', drop.id);
        
        processed++;
      } else {
        errors++;
      }
    }
  }

  return { processed, errors };
}

async function notifyFavoriteBrandDrops() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find new drops from brands released in the last 24 hours
  const { data: newDrops, error: dropsError } = await supabase
    .from('drops')
    .select(`
      *,
      brands (id, name, logo_url)
    `)
    .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .not('brand_id', 'is', null);

  if (dropsError || !newDrops || newDrops.length === 0) {
    console.log('No new drops from favorite brands');
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const drop of newDrops) {
    if (!drop.brand_id) continue;

    // Get users who favorited this brand
    const { data: favorites, error: favError } = await supabase
      .from('user_favorite_brands')
      .select(`
        user_id,
        profiles!inner (
          id,
          display_name,
          notification_preferences
        )
      `)
      .eq('brand_id', drop.brand_id);

    if (favError || !favorites || favorites.length === 0) continue;

    const { data: users } = await supabase.auth.admin.listUsers();
    const userEmailMap = new Map(users?.users.map(u => [u.id, u.email]) || []);

    for (const favorite of favorites) {
      const userEmail = userEmailMap.get(favorite.user_id);
      if (!userEmail) continue;

      const prefs = favorite.profiles.notification_preferences as Record<string, boolean> | null;
      if (prefs && prefs.favorite_brand_drops === false) continue;

      const brandName = drop.brands?.name || 'Unknown Brand';
      const releaseDate = new Date(drop.release_date);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">⭐ New Drop from ${brandName}!</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #000; margin-top: 0;">${drop.title}</h3>
            <p style="color: #666; margin: 10px 0;">
              <strong>Release Date:</strong> ${releaseDate.toLocaleString()}
            </p>
            ${drop.description ? `<p style="color: #666; margin: 10px 0;">${drop.description}</p>` : ''}
          </div>
          <p style="color: #666;">
            One of your favorite brands just announced a new drop!
          </p>
        </div>
      `;

      const success = await sendEmail(
        userEmail,
        `⭐ New drop from ${brandName}`,
        emailHtml,
        {
          user_id: favorite.user_id,
          notification_type: 'favorite_brand',
          title: `New drop from ${brandName}`,
          message: `${brandName} just announced: ${drop.title}`,
          metadata: {
            drop_id: drop.id,
            brand_id: drop.brand_id,
            brand_name: brandName,
          },
        }
      );

      if (success) {
        processed++;
      } else {
        errors++;
      }
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
    console.error('Unauthorized request to send-drop-notifications');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { notification_type } = await req.json().catch(() => ({ notification_type: 'all' }));
    console.log('Starting notification job...', { notification_type });

    const results: Record<string, { processed: number; errors: number }> = {};

    if (notification_type === 'all' || notification_type === 'drop_reminders') {
      results.drop_reminders = await notifyDropGoingLive();
    }

    if (notification_type === 'all' || notification_type === 'favorite_brands') {
      results.favorite_brands = await notifyFavoriteBrandDrops();
    }

    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    console.log('Notification job complete:', { totalProcessed, totalErrors, results });

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        totalErrors,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in notification function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
