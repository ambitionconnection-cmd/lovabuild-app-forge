import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityAlertRequest {
  email: string;
  type: 'account_locked' | 'ip_locked';
  details: {
    attempts?: number;
    lockDuration?: number;
    ipAddress?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, details }: SecurityAlertRequest = await req.json();

    let subject = '';
    let html = '';

    if (type === 'account_locked') {
      subject = '🔒 Security Alert: Account Temporarily Locked';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Security Alert</h1>
          <p>Your HEARDROP account has been temporarily locked due to multiple failed login attempts.</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">Account Details:</h3>
            <ul style="color: #7f1d1d;">
              <li>Email: <strong>${email}</strong></li>
              <li>Failed Attempts: <strong>${details.attempts || 5}</strong></li>
              <li>Lock Duration: <strong>${details.lockDuration || 15} minutes</strong></li>
            </ul>
          </div>

          <h3>What happened?</h3>
          <p>We detected ${details.attempts || 5} failed login attempts on your account. To protect your security, we've temporarily locked your account.</p>

          <h3>What should you do?</h3>
          <ul>
            <li>Wait ${details.lockDuration || 15} minutes before trying to log in again</li>
            <li>If you didn't attempt to log in, consider changing your password</li>
            <li>Contact support if you believe this is an error</li>
          </ul>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            This is an automated security notification from HEARDROP. If you have questions, please contact our support team.
          </p>
        </div>
      `;
    } else if (type === 'ip_locked') {
      subject = '🔒 Security Alert: Suspicious Login Activity';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Security Alert</h1>
          <p>We've detected suspicious login activity from your IP address.</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">Activity Details:</h3>
            <ul style="color: #7f1d1d;">
              <li>IP Address: <strong>${details.ipAddress || 'Unknown'}</strong></li>
              <li>Failed Attempts: <strong>${details.attempts || 10}</strong></li>
              <li>Lock Duration: <strong>${details.lockDuration || 30} minutes</strong></li>
            </ul>
          </div>

          <h3>What happened?</h3>
          <p>We detected multiple failed login attempts from your IP address. This could indicate:</p>
          <ul>
            <li>Someone trying to access your account without permission</li>
            <li>You forgot your password and tried multiple times</li>
            <li>An automated attack on your account</li>
          </ul>

          <h3>What should you do?</h3>
          <ul>
            <li>Wait ${details.lockDuration || 30} minutes before trying to log in again</li>
            <li>Use the "Forgot Password" feature if you don't remember your password</li>
            <li>Change your password immediately if you suspect unauthorized access</li>
            <li>Contact support if this wasn't you</li>
          </ul>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            This is an automated security notification from HEARDROP. If you have questions, please contact our support team.
          </p>
        </div>
      `;
    }

    const { data, error } = await resend.emails.send({
      from: 'HEARDROP Security <onboarding@resend.dev>',
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error('Error sending security alert:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Security alert sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-security-alert function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});