import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version', 'Content-Type': 'application/json' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!url || !key || !anon || !stripeKey) throw new Error('Payment confirmation unavailable.');
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Sign in to confirm payment.' }), { status: 401, headers });
    const { session_id, customer_id } = await req.json();
    const admin = createClient(url, key);
    const { data: dealer } = await admin.from('dealers').select('id').eq('user_id', user.id).single();
    if (!dealer) return new Response(JSON.stringify({ error: 'Dealer account required.' }), { status: 403, headers });
    const { data: customer } = await admin.from('customers').select('id, final_amount, stripe_session_id, payment_verified').eq('id', customer_id).eq('dealer_id', dealer.id).eq('brand', 'pandaprotect').single();
    if (!customer || customer.stripe_session_id !== session_id) throw new Error('Payment does not match this warranty.');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') throw new Error('Payment is still awaiting confirmation. Please check again shortly.');
    if (session.metadata?.customer_id !== customer.id || session.metadata?.dealer_id !== dealer.id || session.currency !== 'gbp' || session.amount_total !== Math.round(Number(customer.final_amount) * 100)) throw new Error('Payment does not match the warranty amount.');
    if (session.metadata.promo_redemption_id) {
      const { error } = await admin.rpc('complete_dealer_promo', { p_redemption_id: session.metadata.promo_redemption_id, p_session_id: session.id, p_amount: Number(customer.final_amount) });
      if (error) throw new Error(error.message);
    }
    if (!customer.payment_verified) {
      const { error } = await admin.from('customers').update({ payment_status: 'paid', payment_verified: true, status: 'Active' }).eq('id', customer.id);
      if (error) throw new Error(error.message);
      await admin.functions.invoke('dealer-warranty-email', { body: { customer_id: customer.id, kind: 'paid' } });
    }
    return new Response(JSON.stringify({ confirmed: true }), { headers });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Payment confirmation failed.' }), { status: 400, headers }); }
});