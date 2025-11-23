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

interface ScheduledExport {
  id: string;
  admin_email: string;
  schedule_type: 'daily' | 'weekly';
  export_format: 'csv' | 'json';
  filters: {
    startDate?: string;
    endDate?: string;
    eventType?: string;
    userEmail?: string;
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function fetchAuditLogs(filters: ScheduledExport['filters']) {
  let query = supabase
    .from('security_audit_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.startDate) {
    query = query.gte('created_at', new Date(filters.startDate).toISOString());
  }
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    query = query.lte('created_at', endDate.toISOString());
  }
  if (filters.eventType && filters.eventType !== 'all') {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters.userEmail) {
    query = query.ilike('user_email', `%${filters.userEmail}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function generateCSV(logs: any[]): string {
  const headers = ['Date/Time', 'Event Type', 'User Email', 'IP Address', 'Event Data'];
  const rows = logs.map(log => [
    new Date(log.created_at).toISOString().replace('T', ' ').split('.')[0],
    log.event_type,
    log.user_email || 'N/A',
    log.ip_address || 'N/A',
    JSON.stringify(log.event_data || {})
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

async function sendExportEmail(
  adminEmail: string,
  exportFormat: 'csv' | 'json',
  scheduleType: 'daily' | 'weekly',
  content: string,
  count: number
) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `security_audit_log_${timestamp}.${exportFormat}`;
  
  const { error } = await resend.emails.send({
    from: 'HEARDROP Security <onboarding@resend.dev>',
    to: [adminEmail],
    subject: `${scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1)} Security Audit Report - ${timestamp}`,
    html: `
      <h2>Security Audit Log Report</h2>
      <p>Your scheduled ${scheduleType} security audit log export is attached.</p>
      <p><strong>Total Events:</strong> ${count}</p>
      <p><strong>Report Date:</strong> ${timestamp}</p>
      <p><strong>Format:</strong> ${exportFormat.toUpperCase()}</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated report from HEARDROP Security Dashboard.<br>
        To manage your scheduled exports, visit the Admin Security Dashboard.
      </p>
    `,
    attachments: [
      {
        filename,
        content: btoa(content),
      }
    ]
  });

  if (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { exportId } = body; // Optional: if provided, only process this export

    console.log('Starting scheduled audit export job...', exportId ? `for export ${exportId}` : '');

    // Fetch active scheduled exports
    let query = supabase
      .from('scheduled_audit_exports')
      .select('*')
      .eq('is_active', true);
    
    // If specific export ID provided, filter to just that one
    if (exportId) {
      query = query.eq('id', exportId);
    }

    const { data: scheduledExports, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    console.log(`Found ${scheduledExports?.length || 0} active scheduled exports`);

    const results = [];
    const now = new Date();
    
    for (const exportConfig of scheduledExports || []) {
      try {
        // For manual triggers, skip the schedule check
        if (!exportId) {
          // Check if we should run this export based on schedule
          const lastRun = exportConfig.last_run_at ? new Date(exportConfig.last_run_at) : null;
          const shouldRun = !lastRun || 
            (exportConfig.schedule_type === 'daily' && now.getTime() - lastRun.getTime() >= 24 * 60 * 60 * 1000) ||
            (exportConfig.schedule_type === 'weekly' && now.getTime() - lastRun.getTime() >= 7 * 24 * 60 * 60 * 1000);

          if (!shouldRun) {
            console.log(`Skipping export ${exportConfig.id} - not due yet`);
            continue;
          }
        }

        console.log(`Processing export ${exportConfig.id} for ${exportConfig.admin_email}`);

        // Fetch audit logs with filters
        const logs = await fetchAuditLogs(exportConfig.filters || {});
        
        if (!logs || logs.length === 0) {
          console.log(`No logs found for export ${exportConfig.id}`);
          results.push({
            id: exportConfig.id,
            email: exportConfig.admin_email,
            status: 'no_data',
            message: 'No audit logs match the configured filters'
          });
          continue;
        }

        // Generate export content
        const content = exportConfig.export_format === 'csv' 
          ? generateCSV(logs)
          : JSON.stringify(logs, null, 2);

        // Send email
        await sendExportEmail(
          exportConfig.admin_email,
          exportConfig.export_format,
          exportConfig.schedule_type,
          content,
          logs.length
        );

        // Update last_run_at
        await supabase
          .from('scheduled_audit_exports')
          .update({ last_run_at: now.toISOString() })
          .eq('id', exportConfig.id);

        results.push({
          id: exportConfig.id,
          email: exportConfig.admin_email,
          status: 'success',
          count: logs.length
        });

        console.log(`Successfully sent export to ${exportConfig.admin_email}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing export ${exportConfig.id}:`, error);
        results.push({
          id: exportConfig.id,
          email: exportConfig.admin_email,
          status: 'error',
          error: errorMessage
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in scheduled export function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
