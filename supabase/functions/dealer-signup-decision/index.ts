import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND = "Panda Protect";
const FROM = "Panda Protect <support@buyawarranty.co.uk>";
const PORTAL_URL = "https://pandaprotect.co.uk/dealer-portal/login";

const esc = (v?: string | null) =>
  (v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const shell = (title: string, body: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f5f6f8;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1e3a5f;padding:24px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">${BRAND}</h1>
    </div>
    <div style="padding:28px;color:#111827;">
      <h2 style="margin:0 0 16px 0;font-size:20px;color:#1e3a5f;">${title}</h2>
      ${body}
    </div>
    <div style="padding:18px 28px;background:#f8f9fa;border-top:1px solid #e9ecef;color:#6b7280;font-size:12px;text-align:center;">
      ${BRAND} · Trade Warranty · hello@pandaprotect.co.uk
    </div>
  </div>
</div>`;

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("") + "!7";
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY missing; skipping email to", to);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // --- auth: must be an active admin user ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: adminRow } = await admin
      .from("admin_users")
      .select("id, is_active")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!adminRow || adminRow.is_active === false) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const signupId: string | undefined = body?.signup_id;
    const decision: string | undefined = body?.decision;
    const notes: string | null = body?.notes?.toString().trim() || null;

    if (!signupId || (decision !== "approve" && decision !== "reject")) {
      return new Response(JSON.stringify({ error: "signup_id and decision (approve|reject) are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signup, error: signupErr } = await admin
      .from("trade_warranty_signups")
      .select("*")
      .eq("id", signupId)
      .maybeSingle();

    if (signupErr || !signup) {
      return new Response(JSON.stringify({ error: "Signup not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = (signup.email_address || "").trim().toLowerCase();
    const contactName = signup.contact_name || signup.dealership_name || "there";

    // ---------------- REJECT ----------------
    if (decision === "reject") {
      await admin
        .from("trade_warranty_signups")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          approved_at: null,
          decision_notes: notes,
          reviewed_by: userData.user.id,
        })
        .eq("id", signupId);

      await sendEmail(
        email,
        `Your ${BRAND} trade application`,
        shell(
          "Thanks for your interest",
          `
          <p style="line-height:1.6;">Hi ${esc(contactName)},</p>
          <p style="line-height:1.6;">Thank you for registering your interest in becoming a ${BRAND} trade partner. After reviewing your application we're not able to open a trade account for you at this time.</p>
          ${notes ? `<p style="line-height:1.6;background:#f8f9fa;border-left:4px solid #eb4b00;padding:12px 16px;">${esc(notes)}</p>` : ""}
          <p style="line-height:1.6;">This isn't a permanent no — our criteria change as we grow, and you're very welcome to apply again in the future.</p>
          <p style="line-height:1.6;">If you'd like to discuss your application, just reply to this email or contact us at hello@pandaprotect.co.uk.</p>
          <p style="line-height:1.6;">Kind regards,<br/>The ${BRAND} Trade Team</p>`
        )
      );

      return new Response(JSON.stringify({ success: true, status: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------------- APPROVE ----------------
    // 1. find or create the auth user
    let userId: string | null = null;
    let password: string | null = generatePassword();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: signup.contact_name || "",
        company_name: signup.dealership_name || "",
        role: "dealer",
      },
    });

    if (createErr) {
      // user probably already exists -> look them up and reset password
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (!existing) {
        console.error("createUser failed:", createErr);
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = existing.id;
      await admin.auth.admin.updateUserById(existing.id, { password });
    } else {
      userId = created.user?.id ?? null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Could not create trader login" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. create / update the dealer record
    const { data: existingDealer } = await admin
      .from("dealers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let dealerId = existingDealer?.id ?? null;

    if (dealerId) {
      await admin
        .from("dealers")
        .update({
          name: signup.contact_name || signup.dealership_name || email,
          email,
          phone: signup.phone_number || null,
          company_name: signup.dealership_name || signup.contact_name || email,
          status: "active",
        })
        .eq("id", dealerId);
    } else {
      const { data: newDealer, error: dealerErr } = await admin
        .from("dealers")
        .insert({
          user_id: userId,
          name: signup.contact_name || signup.dealership_name || email,
          email,
          phone: signup.phone_number || null,
          company_name: signup.dealership_name || signup.contact_name || email,
          status: "active",
        })
        .select("id")
        .single();
      if (dealerErr) {
        console.error("dealer insert failed:", dealerErr);
        return new Response(JSON.stringify({ error: dealerErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      dealerId = newDealer.id;
    }

    // 3. mark signup approved
    await admin
      .from("trade_warranty_signups")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        rejected_at: null,
        decision_notes: notes,
        reviewed_by: userData.user.id,
        dealer_id: dealerId,
      })
      .eq("id", signupId);

    // 4. welcome email with credentials
    await sendEmail(
      email,
      `Welcome to ${BRAND} Trade — your login details`,
      shell(
        "Your trade account is live",
        `
        <p style="line-height:1.6;">Hi ${esc(contactName)},</p>
        <p style="line-height:1.6;">Great news — your ${BRAND} trade application has been approved. You can now quote, sell and manage warranties from your dealer portal.</p>
        ${notes ? `<p style="line-height:1.6;background:#f8f9fa;border-left:4px solid #eb4b00;padding:12px 16px;">${esc(notes)}</p>` : ""}
        <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:20px;margin:22px 0;">
          <div style="padding:6px 0;"><strong>Email:</strong> <span style="font-family:monospace;color:#1e3a5f;">${esc(email)}</span></div>
          <div style="padding:6px 0;"><strong>Temporary password:</strong> <span style="font-family:monospace;font-size:17px;background:#e8f4f8;padding:4px 10px;border-radius:4px;color:#1e3a5f;">${esc(password!)}</span></div>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${PORTAL_URL}" style="display:inline-block;background:#eb4b00;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:8px;">Log in to your dealer portal</a>
        </div>
        <p style="line-height:1.6;font-size:14px;color:#6b7280;">For security, please change your password after your first login.</p>
        <p style="line-height:1.6;">Welcome aboard,<br/>The ${BRAND} Trade Team</p>`
      )
    );

    return new Response(JSON.stringify({ success: true, status: "approved", dealer_id: dealerId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dealer-signup-decision error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
