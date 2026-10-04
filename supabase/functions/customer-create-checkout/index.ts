// Customer paylink checkout: creates a Stripe Checkout session for a saved dealer quote.
// The quote id in the paylink is the secret — prices are always read server-side from
// dealer_quotes, never trusted from the link, so customers cannot tamper with amounts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_KEY) {
      return new Response(JSON.stringify({ error: 'Card payments are not configured yet.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { quote_id, return_url } = await req.json();
    if (!quote_id || typeof quote_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing quote reference.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: quote, error } = await adminClient
      .from('dealer_quotes')
      .select('id, dealer_id, plan_type, vehicle_reg, vehicle_make, vehicle_model, retail_price, status')
      .eq('id', quote_id)
      .maybeSingle();

    if (error || !quote) {
      return new Response(JSON.stringify({ error: 'This payment link is no longer valid.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const amount = Math.round(Number(quote.retail_price) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'This quote has no payable amount.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: dealer } = await adminClient
      .from('dealers')
      .select('company_name')
      .eq('id', quote.dealer_id)
      .maybeSingle();

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2023-10-16' });
    const base = typeof return_url === 'string' && return_url.startsWith('http') ? return_url.split('#')[0].split('?')[0] : 'https://www.pandaprotect.co.uk/customer-quote/';
    const vehicleLabel = [quote.vehicle_make, quote.vehicle_model].filter(Boolean).join(' ') || quote.vehicle_reg;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: amount,
          product_data: {
            name: `Panda Protect Warranty — ${vehicleLabel}`,
            description: `Vehicle ${quote.vehicle_reg} · Supplied by ${dealer?.company_name || 'your dealer'}`,
          },
        },
      }],
      metadata: {
        plan_id: quote.plan_type || 'gold',
        dealer_quote_id: quote.id,
        dealer_id: quote.dealer_id,
        vehicle_reg: quote.vehicle_reg || '',
        source: 'customer_paylink',
      },
      success_url: `${base}?paid=1&quote=${quote.id}`,
      cancel_url: `${base}?cancelled=1&quote=${quote.id}`,
    });

    return new Response(JSON.stringify({ checkout_url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('customer-create-checkout error', err);
    return new Response(JSON.stringify({ error: err.message || 'Could not start payment.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
