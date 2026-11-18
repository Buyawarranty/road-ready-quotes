// Admin/Super Admin actions for partners that need server secrets:
// issue or replace an API key (shown once), reveal the update signing secret, send a test update.
import { z } from 'npm:zod@3.23.8';
import { requireStaffAdmin, serviceClient } from '../_shared/staffAuth.ts';
import { partnerSigningSecret, sendPartnerWebhook, sha256Hex } from '../_shared/partnerWebhook.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const Body = z.object({ action: z.enum(['issue_key', 'signing_secret', 'test_webhook']), partner_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const caller = await requireStaffAdmin(req, { corsHeaders });
  if (caller instanceof Response) return caller;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return reply({ error: 'Invalid request' }, 400);
  const admin = serviceClient();
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
