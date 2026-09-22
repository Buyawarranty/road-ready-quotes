import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { resolveBrand, brandFrom, brandKeyFrom, type Brand } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

interface ReviewEmailRequest {
  customerId: string;
  customerEmail: string;
  customerFirstName: string;
  subject?: string;
  previewOnly?: boolean;
  brand?: string;
}

const logStep = (step: string, details?: any) => {
  console.log(`[TRUSTPILOT-REVIEW-REQUEST] ${step}`, details ? JSON.stringify(details) : '');
};

function getEmailHtml(brand: Brand, firstName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>How was your warranty purchase experience?</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content { padding: 24px 16px !important; }
      .logo { max-width: 160px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .button a { display: block !important; padding: 16px 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 32px 24px 24px 24px; background-color: #ffffff;">
              <a href="${brand.siteUrl}" target="_blank">
                <img src="${brand.logoUrl}" alt="${brand.name}" class="logo" width="180" style="display: block; width: 180px; max-width: 100%; height: auto;" />
              </a>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 24px;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;" />
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td class="content" style="padding: 32px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We hope you're getting on well since purchasing your warranty with ${brand.name}.
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We wanted to check in and hear about your experience buying your warranty with us.
              </p>
              
              <p style="margin: 0 0 28px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                If you have a spare moment, we'd really appreciate your honest feedback on Trustpilot. Your review helps other UK drivers make informed decisions and helps us continue improving our service.
              </p>
              
              <!-- CTA Button - Trustpilot green, conversational text -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="button">
                      <tr>
                        <td align="center" style="border-radius: 6px; background-color: #00b67a;">
                          <a 
                            href="${brand.trustpilotUrl.replace('/review/', '/evaluate/')}" 
                            target="_blank"
                            style="display: inline-block; padding: 16px 32px; background-color: #00b67a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;"
                          >
                            Share your experience on Trustpilot
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Additional Message -->
              <p style="margin: 0 0 28px 0; color: #666666; font-size: 15px; line-height: 1.6; font-style: italic;">
                It takes around 60 seconds, and there's no right or wrong – we value all feedback.
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0 0 28px 0;" />
              
              <!-- Closing -->
              <p style="margin: 0 0 8px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thanks again for choosing ${brand.name}. If you ever need help, our UK-based team is always here.
              </p>
              
              <p style="margin: 28px 0 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Kind regards,
              </p>
              <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                Customer Care Team
              </p>
              <p style="margin: 4px 0 0 0; color: #666666; font-size: 15px;">
                ${brand.name}
              </p>
              <p style="margin: 4px 0 0 0;">
                <a href="tel:${brand.quotePhone.replace(/\s/g, '')}" style="color: #00b67a; font-size: 15px; text-decoration: none; font-weight: 500;">${brand.quotePhone}</a>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <!-- Trustpilot Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 12px auto;">
                <tr>
                  <td align="center">
                    <span style="color: #00b67a; font-size: 18px; margin-right: 4px;">★★★★★</span>
                    <span style="color: #666666; font-size: 14px; font-weight: 500;">Rated Excellent on Trustpilot</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #888888; font-size: 13px;">
                Trusted by thousands of UK drivers
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
    `;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting Trustpilot review request...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      customerId,
      customerEmail,
      customerFirstName,
      subject = "How was your warranty purchase experience?",
      previewOnly = false,
      brand: brandHint,
    }: ReviewEmailRequest = await req.json();

    logStep("Request received", { customerId, customerEmail, customerFirstName, previewOnly });

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    let customerRecord: { brand?: unknown } | null = null;
    if (customerId) {
      const { data } = await supabase
        .from("customers")
        .select("brand")
        .eq("id", customerId)
        .maybeSingle();
      customerRecord = data;
    }

    // Trustpilot review invitations are Buy A Warranty only — Panda Protect
    // must never send them, whatever origin or brand hint is supplied.
    if (brandKeyFrom(brandHint) === "pandaprotect" || brandKeyFrom(customerRecord?.brand) === "pandaprotect") {
      logStep("Skipped - Panda Protect does not send Trustpilot review invitations");
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: "Trustpilot review invitations are Buy A Warranty only" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const brand = resolveBrand(null, { force: "buyawarranty" });

    const firstName = customerFirstName || "there";

    const htmlContent = getEmailHtml(brand, firstName);

    // If preview only, return the HTML without sending
    if (previewOnly) {
      logStep("Preview mode - returning HTML without sending");
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          html: htmlContent,
          subject: subject,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send the email
    logStep("Sending email via Resend", { to: customerEmail });
    
    const emailResult = await resend.emails.send({
      from: brandFrom(brand, "", "hello"),
      to: [customerEmail],
      subject: subject,
      html: htmlContent,
    });

    logStep("Email sent successfully", emailResult);

    // Update customer record to track that review was requested
    if (customerId) {
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          trustpilot_review_requested: true,
          trustpilot_review_requested_at: new Date().toISOString(),
        })
        .eq("id", customerId);

      if (updateError) {
        logStep("Warning: Failed to update customer record", updateError);
      } else {
        logStep("Customer record updated with review request timestamp");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Trustpilot review request sent to ${customerEmail}`,
        resendId: emailResult.data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    logStep("Error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
