import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccessRequestBody {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  requestedRole: string;
  reason: string;
}

const ROLE_LABELS: Record<string, string> = {
  sales: 'Sales',
  support: 'Support',
  accounts: 'Accounts',
  marketing: 'Marketing',
};

const escapeHtml = (value?: string | null) =>
  (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

    const body = await req.json() as Partial<AccessRequestBody>;
    const normalizedEmail = body.email?.trim().toLowerCase();

    console.log("Request body:", {
      ...body,
      email: normalizedEmail ? normalizedEmail.substring(0, 5) + "***" : undefined,
    });

    // Validate required fields
    if (!body.fullName?.trim() || !normalizedEmail || !body.reason?.trim() || !body.requestedRole?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending request from this email
    console.log("Checking for existing pending request for:", normalizedEmail);
    const { data: existingRequest, error: existingError } = await supabaseClient
      .from("access_requests")
      .select("id, status")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing request:", existingError);
    }

    if (existingRequest) {
      console.log("Found existing pending request:", existingRequest.id);
      return new Response(
        JSON.stringify({ error: "You already have a pending access request. Please wait for admin approval." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already has admin access
    const { data: existingAdmin } = await supabaseClient
      .from("admin_users")
      .select("id, is_active")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingAdmin) {
      const message = existingAdmin.is_active 
        ? "This email already has admin access. Please log in at /auth"
        : "Your account has been deactivated. Please contact an administrator.";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert access request
    console.log("Attempting to insert access request...");
    const { data: request, error: insertError } = await supabaseClient
      .from("access_requests")
      .insert({
        email: normalizedEmail,
        full_name: body.fullName.trim(),
        phone: body.phone?.trim() || null,
        company: body.company?.trim() || null,
        reason: body.reason.trim(),
        requested_role: body.requestedRole.trim() || 'sales',
        status: "pending"
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
    
    console.log("Access request inserted successfully:", request?.id);

    console.log("Access request created:", request.id);

    // Send notification email to admin
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      try {
        await resend.emails.send({
          from: "Buyawarranty Customer Care <noreply@buyawarranty.co.uk>",
          to: ["hello@pandaprotect.co.uk"],
          reply_to: normalizedEmail,
          subject: `New Access Request from ${body.fullName.trim()} (${ROLE_LABELS[body.requestedRole.trim()] || body.requestedRole.trim()})`,
          html: `
            <h2>New Admin Access Request</h2>
            <p>A new access request has been submitted:</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(body.fullName)}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(normalizedEmail)}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(body.phone?.trim() || "Not provided")}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(body.company?.trim() || "Not provided")}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; background-color: #fef3c7;"><strong>Requested Role:</strong></td><td style="padding: 8px; border: 1px solid #ddd; background-color: #fef3c7;"><strong>${escapeHtml(ROLE_LABELS[body.requestedRole.trim()] || body.requestedRole.trim())}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(body.reason)}</td></tr>
            </table>
            <p style="margin-top: 20px;">
              <a href="https://pricing.buyawarranty.co.uk/admin-dashboard" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Review in Admin Dashboard
              </a>
            </p>
          `,
        });
        console.log("Admin notification email sent");
      } catch (emailError) {
        console.error("Failed to send admin notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        requestId: request.id,
        message: "Your access request has been received. We will review it and get back to you within 1 business day.",
      }),
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
