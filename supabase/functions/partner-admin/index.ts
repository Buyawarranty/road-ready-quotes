// Admin/Super Admin actions for partners that need server secrets:
// issue or replace an API key (shown once), reveal the update signing secret, send a test update.
import { z } from 'npm:zod@3.23.8';
import { requireStaffAdmin, serviceClient } from '../_shared/staffAuth.ts';
import { BRANDS, brandFrom } from '../_shared/brand.ts';
import { resendFetch } from '../_shared/emailPolish.ts';
import { PARTNER_GUIDE_VERSION, PARTNER_GUIDE_PDF_URL, PARTNER_UPDATE_PERMISSION } from '../_shared/partnerGuideVersion.ts';
import { partnerSigningSecret, sendPartnerWebhook, sha256Hex } from '../_shared/partnerWebhook.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const Body = z.object({ action: z.enum(['issue_key', 'signing_secret', 'test_webhook']), partner_id: z.string().uuid() });
const UpdateBody = z.object({ action: z.literal('send_guide_update'), partner_ids: z.array(z.string().uuid()).min(1).max(200), summary: z.string().trim().min(10).max(3000) });
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function sendGuideUpdate(admin: any, callerId: string, partnerIds: string[], summary: string) {
  const [{ data: roles }, { data: staff }] = await Promise.all([
    admin.from('user_roles').select('role').eq('user_id', callerId),
    admin.from('admin_users').select('permissions').eq('user_id', callerId).maybeSingle(),
  ]);
  const r = (roles ?? []).map((x: { role: string }) => x.role);
  if (!(r.includes('super_admin') || (r.includes('admin') && staff?.permissions?.[PARTNER_UPDATE_PERMISSION] === true))) {
    return reply({ error: 'This action requires its User permissions checkbox.' }, 403);
  }
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return reply({ error: 'Email sending is not set up.' }, 500);
  const brand = BRANDS.pandaprotect;
  const { data: partners } = await admin.from('partners').select('id, name, contact_name, contact_email').in('id', partnerIds);
  const results: { partner_id: string; name: string; success: boolean; error?: string }[] = [];
  for (const p of partners ?? []) {
    const to = String(p.contact_email ?? '').trim();
    let success = false; let error: string | null = null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) error = 'No contact email saved';
    else {
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5;max-width:600px;margin:0 auto;">
<p>Hello ${esc(p.contact_name || p.name)},</p>
<p>We've updated the Panda Protect partner integration guide (version ${PARTNER_GUIDE_VERSION}). Please share this with your developers.</p>
<p><strong>What changed:</strong></p><p style="white-space:pre-line;border-left:3px solid #f97316;padding-left:12px;">${esc(summary)}</p>
<p><a href="${PARTNER_GUIDE_PDF_URL}" style="color:#f97316;font-weight:bold;">Download the latest guide (PDF)</a></p>
<p>Reminder: customers always buy on Panda Protect's own checkout screens. Your platform only shows our button or link.</p>
<p>Questions? Just reply to this email.</p><p>The Panda Protect team</p></div>`;
      try {
        const res = await resendFetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ from: brandFrom(brand, 'Partners', 'hello'), to: [to], subject: `Panda Protect partner guide updated (version ${PARTNER_GUIDE_VERSION})`, html }) });
        if (res.ok) success = true; else error = `Email failed (${res.status}): ${(await res.text()).slice(0, 200)}`;
      } catch (e) { error = e instanceof Error ? e.message : 'Email failed'; }
    }
    await admin.from('partner_guide_update_emails').insert({ partner_id: p.id, guide_version: PARTNER_GUIDE_VERSION, summary, sent_to: to || '-', success, error, sent_by: callerId });
    results.push({ partner_id: p.id, name: p.name, success, ...(error ? { error } : {}) });
  }
  return reply({ results });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const caller = await requireStaffAdmin(req, { corsHeaders });
  if (caller instanceof Response) return caller;
  const raw = await req.json().catch(() => ({}));
  const admin = serviceClient();
  if (raw?.action === 'send_guide_update') {
    const u = UpdateBody.safeParse(raw);
    if (!u.success) return reply({ error: 'Choose at least one partner and write what changed (10+ characters).' }, 400);
    return sendGuideUpdate(admin, caller.user.id, u.data.partner_ids, u.data.summary);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return reply({ error: 'Invalid request' }, 400);
  const { action, partner_id } = parsed.data;
  const { data: partner } = await admin.from('partners').select('id, mode').eq('id', partner_id).maybeSingle();
  if (!partner) return reply({ error: 'Partner not found' }, 404);
  try {
    if (action === 'issue_key') {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const raw = `pp_${partner.mode}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
      const { error } = await admin.from('partners').update({ api_key_hash: await sha256Hex(raw), api_key_prefix: raw.slice(0, 12), updated_at: new Date().toISOString() }).eq('id', partner_id);
      if (error) throw error;
      return reply({ key: raw });
    }
    if (action === 'signing_secret') return reply({ secret: await partnerSigningSecret(partner_id) });
    await sendPartnerWebhook(admin, partner_id, 'ping', { message: 'Test update from Panda Protect' });
    const { data } = await admin.from('partner_webhook_deliveries').select('success, status_code, error').eq('partner_id', partner_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return reply({ delivery: data });
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : 'Failed' }, 500);
  }
});
