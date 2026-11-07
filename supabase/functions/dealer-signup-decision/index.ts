import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { resolveBrand, type Brand } from "../_shared/brand.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const esc = (v?: string | null) =>
  (v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const shell = (brand: Brand, title: string, body: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f5f6f8;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#ffffff;padding:24px;border-bottom:1px solid #e5e7eb;">
      <img src="${brand.logoUrl}" alt="${brand.name}" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;" />
    </div>
    <div style="padding:28px;color:#111827;">
      <h2 style="margin:0 0 16px 0;font-size:20px;color:#1e3a5f;">${title}</h2>
      ${body}
    </div>
    <div style="padding:18px 28px;background:#f8f9fa;border-top:1px solid #e9ecef;color:#6b7280;font-size:12px;text-align:center;">
      ${brand.name} · Trade Warranty · ${brand.helloEmail}
    </div>
  </div>
</div>`;

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("") + "!7";
}

async function sendEmail(brand: Brand, to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY missing; skipping email to", to);
    return { ok: false, error: "Email service key is missing" };
  }
  const from = `${brand.name} <${brand.helloEmail}>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("Resend error:", res.status, text);
    let msg = text;
    try { msg = JSON.parse(text)?.message || text; } catch { /* keep text */ }
    return { ok: false, error: `Email service refused (${res.status}): ${msg}` };
  }
  console.log("Email sent to", to, text);
  return { ok: true, error: null as string | null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const brand: Brand = resolveBrand(req, { force: "pandaprotect" });
  const PORTAL_URL = `${brand.siteUrl}/dealer-portal/login`;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error('Account update configuration is unavailable.');
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
    // Active admin_users staff, or anyone holding an Admin / Super Admin role.
    const [{ data: adminRow }, { data: callerRoles }] = await Promise.all([
      admin.from("admin_users").select("id, is_active").eq("user_id", userData.user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userData.user.id),
    ]);
    const hasAdminRole = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    if (adminRow?.is_active === false || !hasAdminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    let signupId: string | undefined = body?.signup_id;
    let decision: string | undefined = body?.decision;
    let manualCreate = false;

    // Manual dealer creation by staff: record it as a signup, then approve it.
    if (decision === "create") {
      const m = body?.manual ?? {};
      const mEmail = (m.email ?? "").toString().trim().toLowerCase();
      const mPhone = (m.phone ?? "").toString().trim();
      const mCompany = (m.company_name ?? "").toString().trim();
      const mName = (m.contact_name ?? "").toString().trim();
      if (!mCompany || !mEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mEmail) || !mPhone) {
        return new Response(JSON.stringify({ error: "Dealership name, a valid email and phone number are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: dup } = await admin.from("dealers").select("id").ilike("email", mEmail).maybeSingle();
      if (dup) {
        return new Response(JSON.stringify({ error: "A dealer with this email already exists" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: ins, error: insErr } = await admin.from("trade_warranty_signups").insert({
        dealership_name: mCompany.slice(0, 200),
        contact_name: mName.slice(0, 200) || null,
        email_address: mEmail,
        phone_number: mPhone.slice(0, 40),
        additional_information: "Added manually by staff",
        heard_about_us: "Added manually",
        status: "new",
      }).select("id").single();
      if (insErr || !ins) {
        return new Response(JSON.stringify({ error: insErr?.message || "Could not record dealer" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      signupId = ins.id;
      decision = "approve";
      manualCreate = true;
    }
    const notes: string | null = body?.notes?.toString().trim() || null;
    const alternateEmail: string | null =
      body?.alternate_email?.toString().trim().toLowerCase() || null;
    const isResend = decision === "resend";

    if (!signupId || !/^[0-9a-f-]{36}$/i.test(signupId) || (decision !== "approve" && decision !== "reject" && decision !== "status" && !isResend)) {
      return new Response(JSON.stringify({ error: "signup_id and decision (approve|reject|resend) are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail)) {
      return new Response(JSON.stringify({ error: "Invalid alternate email address" }), {
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

    if (decision === 'status' || (decision === 'reject' && (signup.status === 'approved' || signup.approved_at))) {
      const targetStatus = decision === 'reject' ? 'rejected' : String(body.status || '');
      const { data: changed, error } = await admin.rpc('set_dealer_signup_status', { p_signup_id: signupId, p_status: targetStatus, p_actor: userData.user.id, p_notes: notes });
      if (error) throw new Error(error.message);
      const mail = changed.withdrawn || body.notify === true ? await sendEmail(brand, email, `${brand.name} trade account update`, shell(brand, 'An update to your trade account', `
        <p style="line-height:1.6;">Hi ${esc(contactName)},</p>
        <p style="line-height:1.6;">We’re reviewing a few details on your trade account. ${changed.withdrawn ? 'Your approval has been temporarily withdrawn while we complete this update.' : 'We have updated your application status.'}</p>
        ${notes ? `<p style="line-height:1.6;">${esc(notes)}</p>` : ''}
        <p style="line-height:1.6;">Our team will contact you once the review is complete. If you have any questions in the meantime, please reply to this email or contact ${brand.helloEmail}.</p>
        <p style="line-height:1.6;">Existing paid warranties remain active.</p>
        <p style="line-height:1.6;">Thank you for your patience,<br/>The ${brand.name} Trade Team</p>`)) : { ok: true, error: null };
      return new Response(JSON.stringify({ success: true, ...changed, email_sent: mail.ok, email_error: mail.error }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (isResend && signup.status !== 'approved') throw new Error('Approve this application before resending login details.');

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
        brand,
        email,
        `Your ${brand.name} trade application`,
        shell(
          brand,
          "Thanks for your interest",
          `
          <p style="line-height:1.6;">Hi ${esc(contactName)},</p>
          <p style="line-height:1.6;">Thank you for registering your interest in becoming a ${brand.name} trade partner. After reviewing your application we're not able to open a trade account for you at this time.</p>
          ${notes ? `<p style="line-height:1.6;background:#f8f9fa;border-left:4px solid ${brand.accentColor};padding:12px 16px;">${esc(notes)}</p>` : ""}
          <p style="line-height:1.6;">This isn't a permanent no — our criteria change as we grow, and you're very welcome to apply again in the future.</p>
          <p style="line-height:1.6;">If you'd like to discuss your application, just reply to this email or contact us at ${brand.helloEmail}.</p>
          <p style="line-height:1.6;">Kind regards,<br/>The ${brand.name} Trade Team</p>`
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
        role: "trader",
        must_change_password: true,
      },
    });

    if (createErr) {
      // user probably already exists -> look them up and reset password
      let existing: { id: string; user_metadata?: Record<string, unknown> } | undefined;
      for (let page = 1; page <= 50 && !existing; page++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        const users = list?.users ?? [];
        existing = users.find((u) => (u.email || "").toLowerCase() === email);
        if (users.length < 1000) break;
      }
      if (!existing) {
        console.error("createUser failed:", createErr);
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = existing.id;
      await admin.auth.admin.updateUserById(existing.id, { password, user_metadata: { ...(existing.user_metadata ?? {}), must_change_password: true } });
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

    // 2b. give them the trader (dealer) role
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "trader" }, { onConflict: "user_id,role" });
    if (roleErr) console.error("dealer role assign failed:", roleErr);



    // 3. mark signup approved (skipped when just resending credentials)
    if (!isResend) {
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
    }

    // 4. welcome / credentials email
    const sendTo = alternateEmail || email;
    const mail = await sendEmail(
      brand,
      sendTo,
      isResend
        ? `Your ${brand.name} Trade login details`
        : `Welcome to ${brand.name} Trade — your login details`,
      shell(
        brand,
        isResend ? "Your dealer portal login details" : "Your trade account is live",
        `
        <p style="line-height:1.6;">Hi ${esc(contactName)},</p>
        <p style="line-height:1.6;">${isResend
          ? `As requested, here are your ${brand.name} dealer portal login details. Your password has been reset to the temporary one below.`
          : `Great news — your ${brand.name} trade application has been approved. You can now quote, sell and manage warranties from your dealer portal.`}</p>
        ${notes ? `<p style="line-height:1.6;background:#f8f9fa;border-left:4px solid ${brand.accentColor};padding:12px 16px;">${esc(notes)}</p>` : ""}
        <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:20px;margin:22px 0;">
          <div style="padding:6px 0;"><strong>Email:</strong> <span style="font-family:monospace;color:#1e3a5f;">${esc(email)}</span></div>
          <div style="padding:6px 0;"><strong>Temporary password:</strong> <span style="font-family:monospace;font-size:17px;background:#e8f4f8;padding:4px 10px;border-radius:4px;color:#1e3a5f;">${esc(password)}</span></div>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${PORTAL_URL}" style="display:inline-block;background:${brand.accentColor};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:8px;">Log in to your dealer portal</a>
        </div>
        <p style="line-height:1.6;font-size:14px;color:#6b7280;">After signing in, you can choose your own password in Settings → Change password.</p>
        <p style="line-height:1.6;">${isResend ? "Kind regards" : "Welcome aboard"},<br/>The ${brand.name} Trade Team</p>`
      )
    );

    return new Response(JSON.stringify({ success: true, status: isResend ? "resent" : "approved", dealer_id: dealerId, sent_to: sendTo, email_sent: mail.ok, email_error: mail.error, ...(manualCreate ? { login_email: email, temp_password: password } : {}) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dealer-signup-decision error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
