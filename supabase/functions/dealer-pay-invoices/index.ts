// Dealer pays multiple outstanding (invoice_pending) customer plans via Stripe Checkout.
// Body: { dealer_id: string, customer_ids: string[] }
// Returns: { checkout_url, session_id }
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
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { dealer_id, customer_ids } = body as { dealer_id: string; customer_ids: string[] };
    if (!dealer_id || !Array.isArray(customer_ids) || customer_ids.length === 0) {
      return json({ error: 'Missing dealer_id or customer_ids' }, 400);
    }
    if (!STRIPE_KEY) return json({ error: 'Stripe is not configured' }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify dealer
    const { data: dealer } = await admin
      .from('dealers')
      .select('id, user_id, email, name, company_name')
      .eq('id', dealer_id)
      .maybeSingle();
    if (!dealer || dealer.user_id !== user.id) return json({ error: 'Dealer not authorized' }, 403);

    // Fetch the selected customer rows (must belong to this dealer + be unpaid)
    const { data: rows, error: rowsErr } = await admin
      .from('customers')
      .select('id, name, registration_plate, plan_type, payment_type, final_amount, payment_status, dealer_id')
      .in('id', customer_ids)
      .eq('dealer_id', dealer_id);

    if (rowsErr || !rows || rows.length === 0) {
      return json({ error: 'No matching plans' }, 404);
    }

    const billable = rows.filter((r: any) => r.payment_status !== 'paid');
    if (billable.length === 0) return json({ error: 'Nothing to pay — all selected plans are already paid' }, 400);

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-11-20.acacia' });
    const origin = req.headers.get('origin') || 'https://buyawarranty.co.uk';

    const line_items = billable.map((r: any) => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: `Plan ${String(r.plan_type || '').toUpperCase()} · ${r.payment_type || ''}mo`,
          description: `${r.registration_plate || ''} · ${r.name || ''}`,
        },
        unit_amount: Math.round(Number(r.final_amount || 0) * 100),
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: dealer.email,
      line_items,
      success_url: `${origin}/dealer-portal/warranties?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dealer-portal/warranties?paid=0`,
      metadata: {
        source: 'dealer_invoice_batch',
        dealer_id,
        customer_ids: billable.map((r: any) => r.id).join(','),
      },
    });

    return json({ checkout_url: session.url, session_id: session.id }, 200);
  } catch (err: any) {
    console.error('dealer-pay-invoices error', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
