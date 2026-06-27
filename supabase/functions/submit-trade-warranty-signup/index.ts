import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_URL_BASE = "https://pandaprotect.co.uk/dealer-admin/signups";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_PHONE_RE = /^(\+?44\s?|0)\d{2,5}[\s-]?\d{3,4}[\s-]?\d{3,4}$/;

interface TradeWarrantySignupRequest {
  dealership_name?: string | null;
  contact_name?: string | null;
  email_address?: string;
  phone_number?: string;
  monthly_vehicle_sales?: string | null;
  current_warranty_provider?: string | null;
  interested_in?: string | null;
  heard_about_us?: string | null;
  additional_information?: string | null;
}

const row = (label: string, value: string | null | undefined) => `
  <tr>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#374151;width:200px;">${label}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111827;">${value && value.trim() ? value : '<span style="color:#9ca3af">-</span>'}</td>
  </tr>
`;

const esc = (value?: string | null) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role credentials are not configured");
    }

    const body = (await req.json()) as TradeWarrantySignupRequest;
    const payload = {
      dealership_name: body.dealership_name?.trim() || null,
      contact_name: body.contact_name?.trim() || null,
      email_address: body.email_address?.trim() || "",
      phone_number: body.phone_number?.trim() || "",
      monthly_vehicle_sales: body.monthly_vehicle_sales?.trim() || null,
      current_warranty_provider: body.current_warranty_provider?.trim() || null,
      interested_in: body.interested_in?.trim() || null,
      heard_about_us: body.heard_about_us?.trim() || null,
      additional_information: body.additional_information?.trim() || null,
    };

    if (!EMAIL_RE.test(payload.email_address)) {
      return new Response(JSON.stringify({ error: "A valid email address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!UK_PHONE_RE.test(payload.phone_number.replace(/\s+/g, " "))) {
      return new Response(JSON.stringify({ error: "A valid UK phone number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload.heard_about_us) {
      return new Response(JSON.stringify({ error: "Where you sell vehicles is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: signup, error: insertError } = await supabase
      .from("trade_warranty_signups")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("trade_warranty_signups insert failed:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save signup" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const submittedAt = signup.created_at
        ? new Date(signup.created_at).toLocaleString("en-GB", { timeZone: "Europe/London" })
        : new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
      const portalUrl = `${ADMIN_URL_BASE}?id=${encodeURIComponent(signup.id)}`;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
          <h2 style="margin:0 0 8px 0;color:#1e3a5f;">New Trade Warranty Interest Registration</h2>
          <p style="margin:0 0 16px 0;color:#374151;">A new Trade Warranty interest registration has been received.</p>

          <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            ${row("Submission Date", submittedAt)}
            ${row("Dealership Name", esc(payload.dealership_name))}
            ${row("Contact Name", esc(payload.contact_name))}
            ${row("Email Address", `<a href="mailto:${esc(payload.email_address)}" style="color:#eb4b00;text-decoration:none;">${esc(payload.email_address)}</a>`)}
            ${row("Phone Number", `<a href="tel:${esc(payload.phone_number)}" style="color:#eb4b00;text-decoration:none;">${esc(payload.phone_number)}</a>`)}
            ${row("Monthly Vehicle Sales", esc(payload.monthly_vehicle_sales))}
            ${row("Current Warranty Provider", esc(payload.current_warranty_provider))}
            ${row("Interested In", esc(payload.interested_in))}
            ${row("Where They Sell Vehicles", payload.heard_about_us && /^https?:\/\//i.test(payload.heard_about_us) ? `<a href="${esc(payload.heard_about_us)}" target="_blank" style="color:#eb4b00;text-decoration:none;">${esc(payload.heard_about_us)}</a>` : esc(payload.heard_about_us))}
            ${row("Additional Information", esc(payload.additional_information))}
          </table>

          <div style="text-align:center;margin:28px 0 8px 0;">
            <a href="${portalUrl}" style="display:inline-block;background:#eb4b00;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:14px;">
              View in Admin Portal ->
            </a>
          </div>

          <p style="margin-top:24px;color:#6b7280;font-size:12px;text-align:center;">
            Source: /dealer-portal/signup - Panda Protect Trade Warranty
          </p>
        </div>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Panda Protect <support@buyawarranty.co.uk>",
          to: ["hello@pandaprotect.co.uk", "info@pandaprotect.co.uk"],
          reply_to: payload.email_address,
          subject: "New Trade Warranty Interest Registration",
          html,
        }),
      });

      if (!resendResponse.ok) {
        console.error("submit-trade-warranty-signup email failed:", await resendResponse.text());
      }
    } else {
      console.warn("RESEND_API_KEY is not configured; skipping trade warranty signup email notification");
    }

    return new Response(JSON.stringify({ success: true, id: signup.id, created_at: signup.created_at }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("submit-trade-warranty-signup error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
