import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// Configuration thresholds
const OPEN_RATE_THRESHOLD = 15; // Alert if open rate drops below 15%
const CLICK_RATE_THRESHOLD = 5; // Alert if click rate drops below 5%
const DAYS_TO_ANALYZE = 7; // Analyze last 7 days

interface EmailStats {
  email_type: string;
  total_sent: number;
  unique_opens: number;
  unique_clicks: number;
  open_rate: number;
  click_rate: number;
}

async function getEmailStats(): Promise<EmailStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - DAYS_TO_ANALYZE);

  // Get analytics data for the last 7 days
  const { data: analytics, error: analyticsError } = await supabase
    .from('email_analytics')
    .select('user_id, email_type, event_type')
    .gte('created_at', startDate.toISOString());

  if (analyticsError) {
    console.error('Error fetching analytics:', analyticsError);
    return [];
  }

  // Get sent emails count (from notification_history)
  const { data: notifications, error: notificationsError } = await supabase
    .from('notification_history')
    .select('user_id, notification_type')
    .gte('created_at', startDate.toISOString());

  if (notificationsError) {
    console.error('Error fetching notifications:', notificationsError);
  }

  // Process data by email type
  const statsByType = new Map<string, {
    sent: Set<string>;
    opens: Set<string>;
    clicks: Set<string>;
  }>();

  // Count sent emails
  (notifications || []).forEach(notif => {
    const emailType = notif.notification_type;
    if (!statsByType.has(emailType)) {
      statsByType.set(emailType, {
        sent: new Set(),
        opens: new Set(),
        clicks: new Set(),
      });
    }
    statsByType.get(emailType)!.sent.add(notif.user_id);
  });

  // Count opens and clicks
  (analytics || []).forEach(event => {
    const emailType = event.email_type;
    if (!statsByType.has(emailType)) {
      statsByType.set(emailType, {
        sent: new Set(),
        opens: new Set(),
        clicks: new Set(),
      });
    }

    const typeStats = statsByType.get(emailType)!;
    if (event.event_type === 'open') {
      typeStats.opens.add(event.user_id);
    } else if (event.event_type === 'click') {
      typeStats.clicks.add(event.user_id);
    }
  });

  // Calculate stats
  const stats: EmailStats[] = [];
  for (const [emailType, data] of statsByType.entries()) {
    const totalSent = data.sent.size;
    const uniqueOpens = data.opens.size;
    const uniqueClicks = data.clicks.size;

    if (totalSent > 0) {
      stats.push({
        email_type: emailType,
        total_sent: totalSent,
        unique_opens: uniqueOpens,
        unique_clicks: uniqueClicks,
        open_rate: (uniqueOpens / totalSent) * 100,
        click_rate: uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0,
      });
    }
  }

  return stats;
}

async function getAdminEmails(): Promise<string[]> {
  // Get all admin users
  const { data: adminRoles, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (error || !adminRoles || adminRoles.length === 0) {
    console.log('No admin users found');
    return [];
  }

  const adminIds = adminRoles.map(r => r.user_id);

  // Get emails for admin users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching admin emails:', usersError);
    return [];
  }

  return users.users
    .filter(u => adminIds.includes(u.id) && u.email)
    .map(u => u.email!);
}

function generateAlertEmail(alerts: EmailStats[]): string {
  const alertRows = alerts.map(stat => `
    <tr style="border-bottom: 1px solid #e5e5e5;">
      <td style="padding: 12px; text-transform: capitalize;">${stat.email_type.replace(/_/g, ' ')}</td>
      <td style="padding: 12px; text-align: center;">${stat.total_sent}</td>
      <td style="padding: 12px; text-align: center;">
        <span style="color: ${stat.open_rate < OPEN_RATE_THRESHOLD ? '#dc2626' : '#000'}; font-weight: ${stat.open_rate < OPEN_RATE_THRESHOLD ? '600' : '400'};">
          ${stat.open_rate.toFixed(1)}%
        </span>
      </td>
      <td style="padding: 12px; text-align: center;">
        <span style="color: ${stat.click_rate < CLICK_RATE_THRESHOLD ? '#dc2626' : '#000'}; font-weight: ${stat.click_rate < CLICK_RATE_THRESHOLD ? '600' : '400'};">
          ${stat.click_rate.toFixed(1)}%
        </span>
      </td>
    </tr>
  `).join('');

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
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">⚠️ Email Engagement Alert</h1>
            <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Low engagement rates detected</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 20px;">
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
              <strong>Alert:</strong> Some email campaigns are showing engagement rates below the configured thresholds.
            </p>
            
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                <strong>Thresholds:</strong><br>
                Open Rate: Below ${OPEN_RATE_THRESHOLD}%<br>
                Click Rate: Below ${CLICK_RATE_THRESHOLD}%<br>
                Analysis Period: Last ${DAYS_TO_ANALYZE} days
              </p>
            </div>

            <h2 style="margin: 0 0 20px 0; color: #000; font-size: 18px;">Email Performance</h2>
            
            <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e5e5;">Email Type</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e5e5;">Sent</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e5e5;">Open Rate</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e5e5;">Click Rate</th>
                </tr>
              </thead>
              <tbody>
                ${alertRows}
              </tbody>
            </table>

            <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
              <h3 style="margin: 0 0 12px 0; color: #000; font-size: 16px;">Possible Causes:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                <li>Email deliverability issues (spam filters, sender reputation)</li>
                <li>Content relevance to subscribers</li>
                <li>Subject line effectiveness</li>
                <li>Send time optimization</li>
                <li>List quality and subscriber engagement</li>
              </ul>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${supabaseUrl.replace('//', '//')}/admin" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Full Analytics
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              This is an automated alert from HEARDROP Email Monitoring System
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function monitorEmailEngagement() {
  console.log('Starting email engagement monitoring...');

  // Get email statistics
  const stats = await getEmailStats();
  
  if (stats.length === 0) {
    console.log('No email data to analyze');
    return { alerts_sent: 0, message: 'No data available' };
  }

  console.log(`Analyzing ${stats.length} email types`);

  // Find campaigns below threshold
  const alerts = stats.filter(
    stat => stat.open_rate < OPEN_RATE_THRESHOLD || stat.click_rate < CLICK_RATE_THRESHOLD
  );

  if (alerts.length === 0) {
    console.log('All email campaigns performing above threshold');
    return { alerts_sent: 0, message: 'All campaigns performing well' };
  }

  console.log(`Found ${alerts.length} campaigns below threshold`);

  // Get admin emails
  const adminEmails = await getAdminEmails();
  
  if (adminEmails.length === 0) {
    console.log('No admin emails found to send alerts');
    return { alerts_sent: 0, message: 'No admin emails configured' };
  }

  // Send alert email
  const emailHtml = generateAlertEmail(alerts);

  try {
    const { error: sendError } = await resend.emails.send({
      from: 'HEARDROP Alerts <onboarding@resend.dev>',
      to: adminEmails,
      subject: '⚠️ Low Email Engagement Alert - Action Required',
      html: emailHtml,
    });

    if (sendError) {
      console.error('Error sending alert email:', sendError);
      return { alerts_sent: 0, error: sendError.message };
    }

    console.log(`Alert sent to ${adminEmails.length} admin(s)`);
    return {
      alerts_sent: adminEmails.length,
      campaigns_flagged: alerts.length,
      message: 'Alert email sent successfully'
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending alert:', errorMessage);
    return { alerts_sent: 0, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Email engagement monitoring function invoked');
    
    const result = await monitorEmailEngagement();

    console.log('Monitoring complete:', result);

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
    console.error('Error in monitor-email-engagement function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
