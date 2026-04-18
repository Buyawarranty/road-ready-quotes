// Dealer-only Stripe webhook. Filters by metadata.source === 'dealer_journey'.
// Marks dealer_quotes paid and creates a dealer_warranties row.
// Does NOT touch retail webhook or retail tables.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET'); // optional
  if (!stripeKey) {
    return new Response('Stripe not configured', { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
    } else {
      // Dev fallback: parse raw if no signing secret configured
      event = JSON.parse(raw) as Stripe.Event;
    }
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return new Response('Invalid signature', { status: 400, headers: corsHeaders });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata || {};
  if (meta.source !== 'dealer_journey') {
    // Not a dealer event — skip silently so retail webhook owns it
    return new Response(JSON.stringify({ received: true, skipped: 'not_dealer' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dealerQuoteId = meta.dealer_quote_id;
  if (!dealerQuoteId) {
    return new Response('Missing dealer_quote_id metadata', { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: quote, error: qErr } = await supabase
    .from('dealer_quotes')
    .select('*')
    .eq('id', dealerQuoteId)
    .maybeSingle();

  if (qErr || !quote) {
    console.error('Quote not found', dealerQuoteId, qErr);
    return new Response('Quote not found', { status: 404, headers: corsHeaders });
  }

  // Mark quote paid
  await supabase
    .from('dealer_quotes')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
    } as any)
    .eq('id', dealerQuoteId);

  // Create dealer_warranties row
  const months = parseInt(String(quote.warranty_duration), 10) || 12;
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  await supabase.from('dealer_warranties').insert({
    quote_id: quote.id,
    dealer_id: quote.dealer_id,
    customer_name: quote.customer_name,
    vehicle_reg: quote.vehicle_reg,
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    status: 'active',
  } as any);

  return new Response(JSON.stringify({ received: true, dealer_quote_id: dealerQuoteId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
