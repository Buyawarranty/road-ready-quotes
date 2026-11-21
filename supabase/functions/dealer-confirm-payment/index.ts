import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';
import { finaliseDealerCardPayment } from '../_shared/dealerCardPayment.ts';
import { dealerStripeSecret } from '../_shared/dealerStripeMode.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version', 'Content-Type': 'application/json' };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key || !anon) throw new Error('Payment confirmation unavailable.');
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Sign in to confirm payment.' }), { status: 401, headers });
    const { session_id, customer_id } = await req.json();
    if (!session_id || !customer_id) return new Response(JSON.stringify({ error: 'Payment and warranty references are required.' }), { status: 400, headers });

    const admin = createClient(url, key);
    const { data: dealer } = await admin.from('dealers').select('id, is_test').eq('user_id', user.id).single();
    if (!dealer) return new Response(JSON.stringify({ error: 'Dealer account required.' }), { status: 403, headers });
    const { data: ownedCustomer } = await admin.from('customers').select('id').eq('id', customer_id).eq('dealer_id', dealer.id).eq('brand', 'pandaprotect').maybeSingle();
    if (!ownedCustomer) return new Response(JSON.stringify({ error: 'Warranty not found for this dealer.' }), { status: 404, headers });

    const stripe = new Stripe(dealerStripeSecret(dealer.is_test, name => Deno.env.get(name)), { apiVersion: '2024-11-20.acacia' });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const result = await finaliseDealerCardPayment(admin, session, dealer.id);
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    console.error('dealer-confirm-payment error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Payment confirmation failed.' }), { status: 400, headers });
  }
});
