// Sends a one-to-one email from a signed-in BDM/staff member to a dealership
// contact. The sender is the signed-in person's own address (Panda mailbox) —
// otherwise it goes from hello@ with their address as reply-to.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { BRANDS } from "../_shared/brand.ts";
import { resendFetch, withLogo } from "../_shared/emailPolish.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userDb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userDb.auth.getUser();
    if (!user?.email) return json(401, { error: "Please sign in again." });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ok } = await admin.rpc("bdm_is_staff", { _uid: user.id });
    if (!ok) return json(403, { error: "You do not have access to send dealer emails." });

    const b = await req.json().catch(() => ({}));
    const to = String(b.to ?? "").trim().toLowerCase();
    const subject = String(b.subject ?? "").trim().slice(0, 200);
    const body = String(b.body ?? "").trim().slice(0, 10000);
    const dealershipId = typeof b.dealershipId === "string" ? b.dealershipId : null;
    if (!EMAIL.test(to) || !subject || !body) return json(400, { error: "Add a valid recipient, subject and message." });

    const brand = BRANDS.pandaprotect;
    const { data: au } = await admin.from("admin_users").select("first_name,last_name,email").eq("user_id", user.id).maybeSingle();
    const name = [au?.first_name, au?.last_name].filter(Boolean).join(" ") || (user.user_metadata?.full_name as string) || user.email.split("@")[0];
    const own = user.email.toLowerCase();
    const from = own.endsWith(`@${brand.domain}`) ? `${name} <${own}>` : `${name} at Panda Protect <${brand.helloEmail}>`;

    const html = withLogo(`<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:24px">
${esc(body).split(/\n/).map(l => l ? `<p style="margin:0 0 12px">${l}</p>` : "").join("")}
<p style="margin:24px 0 0;color:#4b5563">${esc(name)}<br/>Panda Protect<br/>${esc(own)} · ${brand.quotePhone}</p></div>`, brand);

    const res = await resendFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, reply_to: own }),
    });
    if (!res.ok) { const t = await res.text(); console.error("resend", res.status, t); return json(502, { error: `Email service refused the send (${res.status}).`, details: t }); }

    if (dealershipId) await userDb.rpc("bdm_log_activity", { p_dealership: dealershipId, p_type: "email", p_outcome: null, p_contact: null, p_notes: `Email sent: ${subject}`, p_next_action: null, p_follow_up: null });
    return json(200, { sent: true, from });
  } catch (e) {
    console.error(e); return json(500, { error: (e as Error).message });
  }
});
