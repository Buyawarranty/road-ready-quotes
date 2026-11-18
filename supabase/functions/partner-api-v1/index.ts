// Partner API v1 (server-to-server). Auth: `Authorization: Bearer pp_live_...`.
//   GET /prices?dealer=<id>        standard retail prices for a linked dealer
//   GET /warranties?reg=AB12CDE    warranties sold through this partner (customer-safe)
//   GET /warranties/<id>           one warranty
// Never returns trade cost or profit.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { partnerWarrantySummary, sha256Hex } from '../_shared/partnerWebhook.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Content-Type': 'application/json' };
const reply = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(pp_(?:live|test)_[a-f0-9]{48})$/i)?.[1];
  if (!token) return reply({ error: 'Send Authorization: Bearer pp_live_...' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: partner } = await admin.from('partners').select('id, status, mode').eq('api_key_hash', await sha256Hex(token)).maybeSingle();
  if (!partner || partner.status !== 'active') return reply({ error: 'Invalid or paused key' }, 401);
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const rest = parts.slice(parts.indexOf('partner-api-v1') + 1);

  if (rest[0] === 'prices') {
    const dealer = url.searchParams.get('dealer') || '';
    const { data: link } = await admin.from('partner_dealers').select('id').eq('partner_id', partner.id).eq('dealer_id', dealer).maybeSingle();
    if (!link) return reply({ error: 'Dealer not linked to this partner' }, 404);
    const { data: plan } = await admin.from('dealer_admin_plans').select('pricing_matrix').eq('is_active', true).contains('pricing_matrix', { brand: 'pandaprotect', version: 'annual-v1' }).single();
    const m = plan?.pricing_matrix as any;
    return reply({ currency: 'GBP', terms: (m?.terms || []).filter((t: any) => t.active && (t.months !== 48 || t.approvals_complete)).map((t: any) => ({ months: t.months, price: t.retail_price, boost_price: m.boost?.active ? (m.boost.terms || []).find((b: any) => b.months === t.months)?.retail_price ?? null : null })) });
  }
  if (rest[0] === 'warranties') {
    if (rest[1]) {
      const { data } = await admin.from('customers').select('id').eq('id', rest[1]).eq('partner_id', partner.id).maybeSingle();
      if (!data) return reply({ error: 'Not found' }, 404);
      return reply({ warranty: await partnerWarrantySummary(admin, data.id) });
    }
    let q = admin.from('customers').select('id').eq('partner_id', partner.id).order('created_at', { ascending: false }).limit(100);
    const reg = url.searchParams.get('reg');
    if (reg) q = q.eq('registration_plate', reg.replace(/\s+/g, '').toUpperCase());
    const { data } = await q;
    return reply({ warranties: await Promise.all((data || []).map((r: any) => partnerWarrantySummary(admin, r.id))) });
  }
  return reply({ error: 'Unknown endpoint' }, 404);
});
