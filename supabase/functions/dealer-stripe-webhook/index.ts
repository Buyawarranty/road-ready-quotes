// Dealer-only Stripe webhook. Completes the customer sale, saved quote, warranty and emails.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { finaliseDealerCardPayment } from '../_shared/dealerCardPayment.ts';
import { dealerStripeSecret } from '../_shared/dealerStripeMode.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey) return new Response('Stripe not configured', { status: 500, headers: corsHeaders });

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    const signature = req.headers.get('stripe-signature');
    event = webhookSecret && signature
      ? await stripe.webhooks.constructEventAsync(raw, signature, webhookSecret)
      : JSON.parse(raw) as Stripe.Event;
  } catch (error) {
    console.error('Webhook signature verification failed', error);
    return new Response('Invalid signature', { status: 400, headers: corsHeaders });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const eventSession = event.data.object as Stripe.Checkout.Session;
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Payment confirmation unavailable.');
    const admin = createClient(url, serviceKey);
    // Event metadata is only a lookup hint; the database chooses the key and Stripe confirms the sale.
    const { data: dealer } = await admin.from('dealers').select('id, is_test').eq('id', eventSession.metadata?.dealer_id || '').maybeSingle();
    if (!dealer) return new Response(JSON.stringify({ received: true, skipped: 'not_dealer' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const paymentStripe = new Stripe(dealerStripeSecret(dealer.is_test, name => Deno.env.get(name)), { apiVersion: '2024-06-20' });
    // Never trust forwarded event fields alone: Stripe is authoritative for status, amount and metadata.
    const session = await paymentStripe.checkout.sessions.retrieve(eventSession.id);
    if (session.metadata?.source !== 'dealer_journey') {
      return new Response(JSON.stringify({ received: true, skipped: 'not_dealer' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const result = await finaliseDealerCardPayment(admin, session);
    return new Response(JSON.stringify({ received: true, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('dealer-stripe-webhook completion failed', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Dealer sale completion failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
