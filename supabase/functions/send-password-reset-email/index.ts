import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'
import { Resend } from "https://esm.sh/resend@4.0.0";
import { resolveBrand, brandFrom } from "../_shared/brand.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResetPasswordRequest {
  email: string;
  audience?: 'staff' | 'customer';
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const logStep = (step: string, details?: any) => {
  console.log(`[PASSWORD RESET EMAIL] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: ResetPasswordRequest & { brand?: string } = await req.json();
    const { email } = body;
    // Staff (admin dashboard) and customers get the same recovery link, but staff
    // copy points at /auth instead of the customer portal wording.
    const isStaff = body.audience === 'staff';
    const brand = resolveBrand(req, { brand: body?.brand, fallback: 'pandaprotect' });
    // Send people back to the site they asked from (Panda Protect runs on
    // more than one domain). Supabase only honours redirect URLs on its
    // allow list; anything else lands on the Site URL, which index.html
    // forwards to /reset-password.
    const requestOrigin = (() => {
      try {
        const raw = req.headers.get('origin') || req.headers.get('referer') || '';
        const url = new URL(raw);
        return url.protocol === 'https:' ? url.origin : null;
      } catch {
        return null;
      }
    })();
    const resetRedirect = `${requestOrigin ?? brand.siteUrl}/reset-password`;
    
    logStep('Password reset email request received', { email });

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user exists (paginate — the account may not be on the first page)
    const normalizedEmail = String(email).trim().toLowerCase();
    let user: { email?: string | null } | undefined;
    for (let page = 1; page <= 20; page++) {
      const { data: users, error: findError } = await supabaseClient.auth.admin.listUsers({
        page,
        perPage: 1000
      });

      if (findError) {
        logStep('Error finding users', findError);
        throw findError;
      }

      user = users.users.find(u => (u.email || '').toLowerCase() === normalizedEmail);
      if (user || users.users.length < 1000) break;
    }

    // Only real Panda Protect accounts may reset: active staff or a dealer with
    // their own dealer profile. Old copied logins get the same neutral reply.
    if (user) {
      const uid = (user as { id?: string }).id;
      const [{ data: staffRow }, { data: dealerRow }] = await Promise.all([
        supabaseClient.from('admin_users').select('id').eq('user_id', uid).eq('is_active', true).maybeSingle(),
        supabaseClient.from('dealers').select('id').eq('user_id', uid).maybeSingle(),
      ]);
      if (!staffRow && !dealerRow) {
        logStep('Account is not Panda Protect staff or dealer; no reset sent', { email });
        user = undefined;
      }
    }

    if (!user) {
      // Don't reveal whether email exists or not for security
      logStep('User not found, but returning success for security', { email });
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }


    // Generate password reset link using Supabase Auth
    const { data: resetData, error: resetError } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: resetRedirect
      }
    });

    if (resetError) {
      logStep('Error generating reset link', resetError);
      throw resetError;
    }

    logStep('Generated reset link successfully', { hasActionLink: !!resetData?.properties?.action_link });

    // Use the generated action link for the reset
    // Link straight to our own reset page with the one-time code; the page
    // verifies it in the browser. Keeps the backend address out of the email,
    // avoids the redirect allow list, and stops mail scanners using the link up.
    const hashedToken = resetData?.properties?.hashed_token;
    if (!hashedToken) throw new Error('Could not create a reset link');
    const resetLink = `${resetRedirect}?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
    
    // Send branded email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - ${brand.name}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: ${brand.accentColor}; padding: 30px; text-align: center;">
                    <img src="${brand.logoUrl}" alt="${brand.name}" style="height: 60px; width: auto;">
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h1 style="color: #1f2937; font-size: 28px; margin: 0 0 20px 0; text-align: center;">Password Reset Request</h1>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hello,
                    </p>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                      We received a request to reset the password for your ${brand.name} ${isStaff ? 'admin dashboard' : 'customer portal'} account associated with <strong>${email}</strong>.
                    </p>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                      To reset your password, please click the button below. This link will expire in 24 hours for your security.
                    </p>

                    <!-- Reset Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" 
                         style="display: inline-block; background: ${brand.accentColor}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Reset Your Password
                      </a>
                    </div>
                    
                    
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0;">
                      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                      ${isStaff
                        ? `Once your new password is saved, sign in at ${brand.siteUrl}/auth.`
                        : 'If you need assistance, please contact our customer support team.'}
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">${brand.domain}</p>
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">Your trusted warranty partner</p>
                    
                    <div style="color: #6b7280; font-size: 13px; line-height: 1.6;">
                      <div style="margin-bottom: 5px;">
                        <strong>Claims line:</strong> ${brand.claimsPhone} | ${brand.claimsEmail}
                      </div>
                      <div>
                        <strong>Customer support:</strong> ${brand.quotePhone} | ${brand.supportEmail}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const { data: sent, error: sendError } = await resend.emails.send({
      from: brandFrom(brand, isStaff ? 'Admin' : 'Customer Care', 'noreply'),
      to: [email],
      subject: isStaff ? `Reset your ${brand.name} admin password` : `Reset Your ${brand.name} Portal Password`,
      html: emailHtml,
    });

    if (sendError) {
      logStep('Error sending email', { from: brandFrom(brand, isStaff ? 'Admin' : 'Customer Care', 'noreply'), error: sendError });
      return new Response(
        JSON.stringify({ success: false, error: 'We could not send the reset email right now. Please try again shortly or contact support.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Password reset email sent successfully', { email, id: sent?.id });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    logStep('Password reset email error', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});