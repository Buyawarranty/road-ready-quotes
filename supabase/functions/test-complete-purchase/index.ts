// Marks a TEST dealer's unpaid warranty as paid without a card, then runs the
// same completion steps as a real payment (warranty live, quote completed,
// emails sent). Refuses anything that does not belong to a test dealer.
import { requireStaffAdmin, serviceClient } from '../_shared/staffAuth.ts';
import { notifyDealerSale, syncDealerSale } from '../_shared/dealerSaleFulfilment.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const caller = await requireStaffAdmin(req, { corsHeaders });
    if (caller instanceof Response) return caller;
    const body = await req.json().catch(() => ({}));
    const customerId = typeof body?.customer_id === 'string' ? body.customer_id : '';
    if (!/^[0-9a-f-]{36}$/i.test(customerId)) return json(400, { error: 'A warranty reference is required.' });

    const admin = serviceClient();
    const { data: customer } = await admin.from('customers')
      .select('id, dealer_id, stripe_session_id, payment_verified, brand')
      .eq('id', customerId).eq('brand', 'pandaprotect').maybeSingle();
    if (!customer?.dealer_id) return json(404, { error: 'Warranty not found.' });
    const { data: dealer } = await admin.from('dealers').select('id, is_test').eq('id', customer.dealer_id).maybeSingle();
    if (!dealer?.is_test) return json(403, { error: 'Only test dealer purchases can be marked paid here.' });
    if (customer.payment_verified) return json(200, { confirmed: true, alreadyConfirmed: true });

    let quoteId: string | null = null;
    if (customer.stripe_session_id) {
      const { data: q } = await admin.from('dealer_quotes').select('id').eq('dealer_id', dealer.id).eq('stripe_session_id', customer.stripe_session_id).maybeSingle();
      quoteId = q?.id ?? null;
    }
    const now = new Date().toISOString();
    const { data: confirmed, error } = await admin.from('customers').update({
      payment_status: 'paid', payment_verified: true, payment_verified_at: now,
      payment_verification_status: 'verified', payment_verification_source: 'test',
      status: 'Active', is_test: true, updated_at: now,
    }).eq('id', customer.id).eq('payment_verified', false).select('id').maybeSingle();
    if (error) throw new Error(error.message);

    const sale = await syncDealerSale(admin, { customerId: customer.id, quoteId, stripeSessionId: customer.stripe_session_id, quoteStatus: 'paid' });
    const email = confirmed ? await notifyDealerSale(admin, customer.id, 'paid') : null;
    return json(200, { confirmed: true, alreadyConfirmed: !confirmed, sale, email });
  } catch (e) {
    console.error('test-complete-purchase', e);
    return json(400, { error: e instanceof Error ? e.message : 'Could not complete the test purchase.' });
  }
});
