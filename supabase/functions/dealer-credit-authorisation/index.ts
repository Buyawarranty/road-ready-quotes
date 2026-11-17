import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { z } from 'npm:zod@3.23.8';
import { canAuthorizeDealerCreditRole, canReviewDealerCreditRequestRole } from '../_shared/dealerIntroOffer.ts';

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('accept_terms'),
    dealer_id: z.string().uuid(),
    terms_version: z.string().min(1).max(50),
  }),
  z.object({
    action: z.literal('request_credit'),
    dealer_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('review_request'),
    request_id: z.string().uuid(),
    decision: z.enum(['approved', 'rejected']),
    note: z.string().trim().max(2000).optional().nullable(),
  }),
]);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid request', fields: parsed.error.flatten().fieldErrors }, 400);

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
    const body = parsed.data;

    if (body.action === 'review_request') {
      const { data: roles, error: roleError } = await admin.from('user_roles')
        .select('role').eq('user_id', user.id).in('role', ['admin', 'super_admin', 'accounts', 'accounts_manager']);
      if (roleError || !roles?.some((row) => canReviewDealerCreditRequestRole(row.role))) return json({ error: 'Only Accounts, Admin and Super Admin can review credit requests' }, 403);
      const { data, error } = await admin.rpc('review_dealer_paylater_request', {
        p_request_id: body.request_id,
        p_decision: body.decision,
        p_note: body.note || null,
        p_reviewed_by: user.id,
      });
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    const { data: dealer, error: dealerError } = await admin.from('dealers')
      .select('id').eq('id', body.dealer_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (dealerError || !dealer) return json({ error: 'Dealer not authorized' }, 403);

    if (body.action === 'accept_terms') {
      const { data, error } = await admin.rpc('accept_dealer_trade_terms', {
        p_dealer_id: body.dealer_id,
        p_terms_version: body.terms_version,
        p_accepted_by: user.id,
      });
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    const { data, error } = await admin.rpc('request_dealer_paylater', {
      p_dealer_id: body.dealer_id,
      p_requested_by: user.id,
    });
    if (error) return json({ error: error.message }, 400);
    return json(data);
  } catch (error) {
    console.error('dealer-credit-authorisation error', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to process request' }, 500);
  }
});
