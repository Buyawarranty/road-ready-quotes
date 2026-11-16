import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { z } from 'npm:zod@3.23.8';
import { canAuthorizeDealerCreditRole } from '../_shared/dealerIntroOffer.ts';
import { notifyDealerSale, syncDealerSale } from '../_shared/dealerSaleFulfilment.ts';

const BodySchema = z.object({
  redemption_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(2000).nullable().optional(),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !serviceKey || !anonKey) return json({ error: 'Service configuration unavailable' }, 500);
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing authorization' }, 401);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);
    const admin = createClient(url, serviceKey);
    const { data: roles, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'super_admin']);
    if (roleError || !roles?.some((row) => canAuthorizeDealerCreditRole(row.role))) return json({ error: 'Only Admin and Super Admin can review free warranties' }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'A valid decision is required' }, 400);
    const { redemption_id, decision, note } = parsed.data;

    const { data: result, error } = await admin.rpc('review_dealer_intro_free', {
      p_redemption_id: redemption_id, p_decision: decision, p_reviewer: user.id, p_note: note?.trim() || null,
    });
    if (error) return json({ error: error.message }, 400);
    if (result?.already) return json({ success: true, already: true, status: result.status });

    let email = null;
    if (decision === 'approved') {
      await syncDealerSale(admin, { customerId: result.customer_id, quoteId: result.dealer_quote_id || null, quoteStatus: 'paid' });
      email = await notifyDealerSale(admin, result.customer_id, 'paid');
    }
    return json({ success: true, status: decision, email });
  } catch (error) {
    console.error('dealer-intro-free-decision error', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to review free warranty' }, 500);
  }
});
