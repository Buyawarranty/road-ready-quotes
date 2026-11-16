import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { z } from 'npm:zod@3.23.8';
import { canAuthorizeDealerCreditRole } from '../_shared/dealerIntroOffer.ts';
import { notifyDealerSale, syncDealerSale } from '../_shared/dealerSaleFulfilment.ts';

const BodySchema = z.object({ customer_id: z.string().uuid() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'A valid warranty sale is required' }, 400);
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
    if (roleError || !roles?.some((row) => canAuthorizeDealerCreditRole(row.role))) return json({ error: 'Only Admin and Super Admin can confirm invoice payments' }, 403);

    const customerId = parsed.data.customer_id;
    const { data: customer, error: customerError } = await admin.from('customers')
      .select('id, payment_status, dealer_id, brand')
      .eq('id', customerId).eq('brand', 'pandaprotect').not('dealer_id', 'is', null).maybeSingle();
    if (customerError || !customer) return json({ error: 'Dealer sale not found' }, 404);
    if (customer.payment_status === 'paid') return json({ success: true, already_paid: true });
    if (!['invoice_pending', 'overdue'].includes(customer.payment_status)) {
      return json({ error: 'Only an approved 30-day invoice can be confirmed here' }, 409);
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin.from('customers').update({
      payment_status: 'paid',
      status: 'Active',
      payment_verified: true,
      payment_collected_at: now,
      payment_collected_by: user.id,
      payment_confirmed_by: user.id,
      payment_verified_at: now,
      payment_verified_by: user.id,
      payment_verification_status: 'verified',
      payment_verification_source: 'admin_invoice',
      payment_verification_ref: user.id,
      deferred_paid_at: now,
    }).eq('id', customerId).in('payment_status', ['invoice_pending', 'overdue']).select('id').maybeSingle();
    if (updateError) return json({ error: updateError.message }, 400);
    if (!updated) return json({ success: true, already_paid: true });

    const { data: quote } = await admin.from('dealer_quotes').select('id').eq('stripe_session_id', `invoice:${customerId}`).maybeSingle();
    await syncDealerSale(admin, { customerId, quoteId: quote?.id || null, stripeSessionId: `invoice:${customerId}`, quoteStatus: 'paid' });
    const email = await notifyDealerSale(admin, customerId, 'paid');
    return json({ success: true, email });
  } catch (error) {
    console.error('dealer-confirm-invoice-payment error', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to confirm invoice payment' }, 500);
  }
});
