// Resets a staff member's password and emails them their admin login details.
// Panda Protect branded; includes the first-screen gateway password.
// Only signed-in Admins / Super Admins may call it (checked in code).
import { resolveBrand } from "../_shared/brand.ts";
import { requireStaffAdmin, serviceClient } from "../_shared/staffAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_PASSWORD = "PandaPanda2026!!";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const log = (step: string, details?: unknown) =>
  console.log(`[SEND-ADMIN-LOGIN] ${step}${details ? " " + JSON.stringify(details) : ""}`);

const genPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const caller = await requireStaffAdmin(req, { corsHeaders });
  if (caller instanceof Response) return caller;

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = String(body?.name ?? "").trim().slice(0, 80);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { success: false, error: "A valid email is required" });

    const brand = resolveBrand(req, { brand: body?.brand, fallback: "pandaprotect" });
    const origin = req.headers.get("origin");
    const base = origin && /^https:\/\//.test(origin) ? origin : brand.siteUrl;
    const loginUrl = `${base}/auth`;

    const admin = serviceClient();
    // Find the auth user by email (paged).
    let authUserId: string | null = null;
    for (let page = 1; page <= 20 && !authUserId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`Could not look up user: ${error.message}`);
      const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (hit) authUserId = hit.id;
      if (data.users.length < 1000) break;
    }
    if (!authUserId) return json(404, { success: false, error: `No login found for ${email}` });

    // Only staff accounts may be handled here.
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", authUserId);
    const { data: adminRow } = await admin.from("admin_users").select("id").eq("user_id", authUserId).maybeSingle();
    if (!(roles?.length) && !adminRow) return json(403, { success: false, error: "That account is not a staff login." });

    const password = genPassword();
    log("Resetting password", { userId: authUserId, email });
    const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, { password, email_confirm: true });
    if (updErr) throw new Error(`Could not set password: ${updErr.message}`);

    const greeting = name ? `Hello ${esc(name)},` : "Hello,";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" style="border-collapse:collapse;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" style="width:560px;max-width:100%;border:1px solid #e5e7eb;border-radius:10px;">
<tr><td style="padding:24px;text-align:center;border-bottom:1px solid #e5e7eb;">
<img src="${brand.logoUrl}" alt="${brand.name}" style="height:56px;"/>
<h1 style="margin:12px 0 0;font-size:22px;">${brand.name} admin login</h1></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6;">
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Here are your login details for the ${brand.name} admin dashboard. There are two steps.</p>
<p style="margin:0 0 6px;font-weight:bold;">Step 1 — first screen (Protected Area)</p>
<p style="margin:0 0 16px;font-family:monospace;background:#f3f4f6;padding:10px;border-radius:6px;">Gateway password: <strong>${GATEWAY_PASSWORD}</strong></p>
<p style="margin:0 0 6px;font-weight:bold;">Step 2 — your own login</p>
<p style="margin:0 0 16px;font-family:monospace;background:#f3f4f6;padding:10px;border-radius:6px;">Email: ${esc(email)}<br/>Password: <strong>${password}</strong></p>
<p style="text-align:center;margin:24px 0;"><a href="${loginUrl}" style="background:${brand.accentColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">Open the login page</a></p>
<p style="margin:0;font-size:13px;color:#6b7280;">Please keep these details private and change your password after you sign in.</p>
</td></tr>
<tr><td style="padding:16px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">${brand.legalName}</td></tr>
</table></td></tr></table></body></html>`;

    const text = `${brand.name} admin login\n\nStep 1 — first screen (Protected Area)\nGateway password: ${GATEWAY_PASSWORD}\n\nStep 2 — your own login\nLogin page: ${loginUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease keep these details private and change your password after you sign in.`;

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("Email service is not configured");
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${brand.name} <${brand.noReplyEmail}>`,
        to: [email],
        subject: `${brand.name} admin login`,
        html,
        text,
      }),
    });
    const sendBody = await send.json().catch(() => ({}));
    if (!send.ok) {
      log("Send failed", { status: send.status, body: sendBody });
      return json(200, { success: false, password, loginUrl, error: `Password was reset, but the email was NOT sent: ${sendBody?.message ?? send.status}` });
    }
    const emailId = sendBody?.id;
    log("Email accepted", { id: emailId });

    // The email service accepts blocked addresses then drops them; check shortly after.
    let lastEvent: string | null = null;
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const st = await fetch(`https://api.resend.com/emails/${emailId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      const sb = await st.json().catch(() => ({}));
      lastEvent = sb?.last_event ?? null;
      if (lastEvent && lastEvent !== "queued" && lastEvent !== "sent") break;
    }
    log("Delivery status", { id: emailId, lastEvent });
    if (lastEvent === "suppressed" || lastEvent === "bounced") {
      return json(200, {
        success: false,
        password,
        loginUrl,
        error: `Password was reset, but the email service blocked delivery to ${email} (${lastEvent}) because earlier emails to this address bounced. Share the details below by hand, or use a different email address.`,
      });
    }

    return json(200, { success: true, emailId, deliveryStatus: lastEvent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return json(500, { success: false, error: msg });
  }
});
