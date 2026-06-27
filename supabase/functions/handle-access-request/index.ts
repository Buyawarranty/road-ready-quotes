import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABELS: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  accounts: "Accounts",
  marketing: "Marketing",
};

const SUCCESS_MESSAGE =
  "Your access request has been received. We will review it and get back to you within 1 business day.";

const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const trimStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const handler = async (req: Request): Promise<Response> => {
  console.log("Handle access request function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Safely parse JSON body
    let raw: any = null;
    try {
      raw = await req.json();
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!raw || typeof raw !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullName = trimStr(raw.fullName);
    const emailRaw = trimStr(raw.email);
    const email = emailRaw.toLowerCase();
    const phone = trimStr(raw.phone);
    const company = trimStr(raw.company);
    const requestedRole = trimStr(raw.requestedRole) || "sales";
    const reason = trimStr(raw.reason);

    if (!fullName || !email || !reason || !requestedRole) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Existing pending request?
    const { data: existingRequest, error: existingError } = await supabaseClient
      .from("access_requests")
      .select("id, status")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing request:", existingError);
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: "You already have a pending access request. Please wait for admin approval." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Existing admin?
    const { data: existingAdmin, error: adminError } = await supabaseClient
      .from("admin_users")
      .select("id, is_active")
      .eq("email", email)
      .maybeSingle();

    if (adminError) {
      console.error("Error checking admin_users:", adminError);
    }

    if (existingAdmin) {
      const message = existingAdmin.is_active
        ? "This email already has admin access. Please log in at /auth"
        : "Your account has been deactivated. Please contact an administrator.";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert
    const { data: request, error: insertError } = await supabaseClient
      .from("access_requests")
      .insert({
        email,
        full_name: fullName,
        phone: phone || null,
        company: company || null,
        reason,
        requested_role: requestedRole,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting access request:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message || "Failed to submit access request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mirror into Panda Admin signups feed
    try {
      const { error: signupErr } = await supabaseClient
        .from("trade_warranty_signups")
        .insert({
          contact_name: fullName,
          email_address: email,
          phone_number: phone || "Not provided",
          dealership_name: company || null,
          interested_in: requestedRole,
          additional_information: `Admin access request (${ROLE_LABELS[requestedRole] || requestedRole}): ${reason}`,
          status: "new",
        });
      if (signupErr) console.error("Failed to mirror to trade_warranty_signups:", signupErr);
    } catch (mirrorErr) {
      console.error("Mirror to signups threw:", mirrorErr);
    }

    // Notify admin

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const roleLabel = ROLE_LABELS[requestedRole] || requestedRole;
      try {
        await resend.emails.send({
          from: "Panda Protect <noreply@buyawarranty.co.uk>",
          to: ["hello@pandaprotect.co.uk"],
          reply_to: email,
          subject: `New Access Request from ${fullName} (${roleLabel})`,
          html: `
            <h2>New Admin Access Request</h2>
            <p>A new access request has been submitted:</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(fullName)}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(email)}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(phone || "Not provided")}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(company || "Not provided")}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; background-color: #fef3c7;"><strong>Requested Role:</strong></td><td style="padding: 8px; border: 1px solid #ddd; background-color: #fef3c7;"><strong>${escapeHtml(roleLabel)}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(reason)}</td></tr>
            </table>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send admin notification email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, requestId: request.id, message: SUCCESS_MESSAGE }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in handle-access-request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
