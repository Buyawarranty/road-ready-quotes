// Return page after a partner customer pays. Stripe is the source of truth.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';
import { finaliseDealerCardPayment } from '../_shared/dealerCardPayment.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version', 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const { session_id } = await req.json().catch(() => ({}));
    if (typeof session_id !== 'string' || !/^cs_[A-Za-z0-9_]{10,200}$/.test(session_id)) return new Response(JSON.stringify({ error: 'Payment reference missing.' }), { status: 400, headers });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-11-20.acacia' });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session.metadata?.partner_id) return new Response(JSON.stringify({ error: 'Payment not found.' }), { status: 404, headers });
    await finaliseDealerCardPayment(admin, session);
    const { data } = await admin.from('customers').select('registration_plate, payment_type, final_amount, email').eq('id', session.metadata.customer_id).maybeSingle();
    return new Response(JSON.stringify({ confirmed: true, registration: data?.registration_plate, term_months: Number(data?.payment_type) || null, amount: Number(data?.final_amount), email: data?.email }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Payment confirmation failed.' }), { status: 400, headers });
  }
});
