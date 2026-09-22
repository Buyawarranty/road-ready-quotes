import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { resolveBrand, brandFrom } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role credentials are not configured");
    }

    const body: { email?: string; brand?: string } = await req.json();
    const { email } = body;
    const brand = resolveBrand(req, { brand: body?.brand });
    const SITE_ORIGIN = brand.siteUrl;
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!EMAIL_RE.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: "A valid email address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Build a fresh confirmation link for the just-created account. If the
    // account is already confirmed (or link generation fails), fall back to a
    // plain welcome email with a sign-in button instead.
    let confirmLink: string | null = null;
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "signup",
        email: cleanEmail,
        options: { redirectTo: `${SITE_ORIGIN}/customer-dashboard` },
      });
      if (!error && data?.properties?.action_link) {
        confirmLink = data.properties.action_link;
      } else if (error) {
        console.warn("generateLink(signup) failed:", error.message);
      }
    } catch (linkError) {
      console.warn("generateLink threw:", linkError);
    }

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not configured; skipping signup welcome email");
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);

    const button = confirmLink
      ? `<a href="${confirmLink}" style="display:inline-block;background:${brand.accentColor};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;font-size:15px;">Confirm my email</a>`
      : `<a href="${SITE_ORIGIN}/auth" style="display:inline-block;background:${brand.accentColor};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;font-size:15px;">Sign in to your account</a>`;

    const introLine = confirmLink
      ? `You're one click away. Confirm your email address to activate your ${brand.name} account.`
      : `Your ${brand.name} account is ready. Sign in any time to manage your warranty.`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f6f8;padding:24px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:#0f2544;padding:24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;">${brand.name}</h1>
          </div>
          <div style="padding:32px 28px;color:#111827;">
            <h2 style="margin:0 0 16px 0;font-size:22px;color:#0f2544;">Welcome to ${brand.name}</h2>
            <p style="line-height:1.6;">Hi,</p>
            <p style="line-height:1.6;">Thanks for creating an account with <strong>${cleanEmail}</strong>. ${introLine}</p>
            <div style="text-align:center;margin:28px 0;">
              ${button}
            </div>
            <p style="line-height:1.6;color:#6b7280;font-size:13px;">This link expires after 24 hours. If the button doesn't work, copy and paste this address into your browser:<br/>
            <span style="word-break:break-all;color:#6b7280;">${confirmLink || `${SITE_ORIGIN}/auth`}</span></p>
            <p style="line-height:1.6;">Once you're signed in you can view your warranty details, upload documents, and make a claim — all from your dashboard.</p>
            <p style="line-height:1.6;">If you didn't create this account, you can safely ignore this email.</p>
            <p style="line-height:1.6;">Kind regards,<br/>The ${brand.name} Team</p>
          </div>
          <div style="padding:18px 28px;background:#f8f9fa;border-top:1px solid #e9ecef;color:#6b7280;font-size:12px;text-align:center;">
            ${brand.name} · ${brand.supportEmail}
          </div>
        </div>
      </div>
    `;

    const { error: sendError } = await resend.emails.send({
      from: brandFrom(brand, "", "hello"),
      to: [cleanEmail],
      reply_to: brand.supportEmail,
      subject: `Welcome to ${brand.name} — confirm your email`,
      html,
    });

    if (sendError) {
      console.error("send-signup-confirmation email failed:", sendError);
      return new Response(JSON.stringify({ success: false, error: sendError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email: cleanEmail, link_generated: Boolean(confirmLink) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-signup-confirmation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
