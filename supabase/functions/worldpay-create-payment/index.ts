// Embedded Worldpay card payment (Access Checkout session -> Payments API).
// MOTO / virtual terminal flow: the card is captured in our own UI via
// Worldpay's Access Checkout Web SDK, which returns a short-lived session href.
// We exchange that session for an authorization here. No card data ever
// touches our servers.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface Billing {
  first_name?: string | null;
  last_name?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  city?: string | null;
  county?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
}

interface Body {
  session_href?: string;
  cardholder_name?: string | null;
  amount_pence?: number;
  currency?: string;
  description?: string;
  sales_lead_id?: string | null;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  billing?: Billing | null;
}

const clean = (v: unknown, max = 50) =>
  String(v ?? '')
    .replace(/[^a-zA-Z0-9\-.,'/& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

function buildBillingAddress(billing?: Billing | null) {
  if (!billing) return undefined;
  const address1 = clean(billing.address1);
  const city = clean(billing.city);
  const postalCode = clean(billing.postal_code, 12).toUpperCase();
  if (!address1 || !city) return undefined;

  const out: Record<string, string> = {
    address1,
    city,
    countryCode: (clean(billing.country_code, 2) || 'GB').toUpperCase(),
  };
  if (postalCode) out.postalCode = postalCode;
  const address2 = clean(billing.address2);
  if (address2) out.address2 = address2;
  const address3 = clean(billing.address3);
  if (address3) out.address3 = address3;
  const county = clean(billing.county, 30);
  if (county) out.state = county;
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const USERNAME = Deno.env.get('WORLDPAY_USERNAME');
    const PASSWORD = Deno.env.get('WORLDPAY_PASSWORD');
    const ENTITY = Deno.env.get('WORLDPAY_ENTITY') ?? 'default';
    const ENVIRONMENT =
      (Deno.env.get('WORLDPAY_ENVIRONMENT') ?? 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';

    if (!USERNAME || !PASSWORD) {
      return json(
        { error: 'Worldpay is not configured yet. Add WORLDPAY_USERNAME, WORLDPAY_PASSWORD and WORLDPAY_ENTITY.' },
        503,
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // --- Auth: staff-only (admin or sales) ---------------------------------
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Not authenticated' }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: 'Not authenticated' }, 401);

    const { data: allowed, error: roleErr } = await supabase.rpc('is_admin_or_sales', { _user_id: user.id });
    if (roleErr || !allowed) return json({ error: 'Not authorised to take payments' }, 403);

    // --- Input -------------------------------------------------------------
    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const sessionHref = String(body.session_href || '').trim();
    if (!/^https:\/\/[a-z0-9.\-]*access\.worldpay\.com\//i.test(sessionHref)) {
      return json({ error: 'A valid Worldpay card session is required' }, 400);
    }

    const amountPence = Math.round(Number(body.amount_pence ?? 0));
    if (!Number.isFinite(amountPence) || amountPence <= 0) {
      return json({ error: 'amount_pence must be a positive number' }, 400);
    }
    const currency = (body.currency || 'GBP').toUpperCase();
    const description = (body.description || 'Vehicle warranty payment').slice(0, 200);

    // --- Pending transaction row ------------------------------------------
    const { data: txn, error: txnErr } = await supabase
      .from('worldpay_transactions')
      .insert({
        flow: 'moto',
        amount_pence: amountPence,
        currency,
        description,
        environment: ENVIRONMENT,
        status: 'pending',
        admin_user_id: user.id,
        sales_lead_id: body.sales_lead_id || null,
        customer_id: body.customer_id || null,
        customer_email: body.customer_email || null,
        customer_phone: body.customer_phone || null,
        last_event: 'embedded_card_submitted',
      })
      .select('id')
      .single();

    if (txnErr || !txn) {
      console.error('worldpay txn insert error', txnErr);
      return json({ error: txnErr?.message || 'Could not create transaction' }, 500);
    }

    const transactionReference = `PP-${txn.id}`;
    const base = ENVIRONMENT === 'live' ? 'https://access.worldpay.com' : 'https://try.access.worldpay.com';

    const narrative =
      String(description || 'Panda Protect')
        .replace(/[^a-zA-Z0-9\-., ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 24) || 'Panda Protect';

    const paymentInstrument: Record<string, unknown> = {
      type: 'checkout',
      sessionHref,
    };
    const cardHolderName = clean(body.cardholder_name, 60);
    if (cardHolderName) paymentInstrument.cardHolderName = cardHolderName;
    const billingAddress = buildBillingAddress(body.billing);
    if (billingAddress) paymentInstrument.billingAddress = billingAddress;

    const instruction: Record<string, unknown> = {
      requestAutoSettlement: { enabled: true },
      narrative: { line1: narrative },
      value: { currency, amount: amountPence },
      paymentInstrument,
    };
    const customer: Record<string, string> = {};
    if (body.customer_email) customer.email = String(body.customer_email).slice(0, 120);
    if (body.customer_phone) customer.phone = String(body.customer_phone).slice(0, 30);
    if (Object.keys(customer).length) instruction.customer = customer;

    const payload = {
      transactionReference,
      merchant: { entity: ENTITY },
      instruction,
      // MOTO: agent keys the card on the phone. 3DS is not applicable (and is
      // rejected by Worldpay) for this channel.
      channel: 'moto',
    };

    const wpRes = await fetch(`${base}/api/payments`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${USERNAME}:${PASSWORD}`),
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'WP-Api-Version': '2024-06-01',
      },
      body: JSON.stringify(payload),
    });

    const raw = await wpRes.json().catch(() => ({}));

    if (!wpRes.ok) {
      console.error('Worldpay payment error', wpRes.status, raw);
      await supabase
        .from('worldpay_transactions')
        .update({
          status: 'failed',
          last_error: JSON.stringify(raw).slice(0, 1000),
          last_event: 'authorization_failed',
          raw_response: raw,
        })
        .eq('id', txn.id);
      return json(
        {
          error:
            (raw as any)?.message ||
            (raw as any)?.errorName ||
            'Worldpay declined the request',
          worldpay_status: wpRes.status,
          environment: ENVIRONMENT,
          entity: ENTITY,
        },
        502,
      );
    }

    const outcome = String((raw as any)?.outcome || '').trim();
    const paymentId = (raw as any)?.paymentId || null;
    const status =
      outcome === 'authorized' ? 'authorized' : outcome === 'refused' ? 'refused' : outcome || 'pending';

    await supabase
      .from('worldpay_transactions')
      .update({
        status,
        worldpay_payment_id: paymentId,
        raw_response: raw,
        last_event: `payment_${outcome || 'unknown'}`,
        last_error:
          outcome === 'authorized' ? null : ((raw as any)?.body?.refusalDescription || null),
      })
      .eq('id', txn.id);

    return json({
      transaction_id: txn.id,
      transaction_reference: transactionReference,
      outcome: outcome || 'unknown',
      status,
      payment_id: paymentId,
      environment: ENVIRONMENT,
      refusal_description: (raw as any)?.body?.refusalDescription ?? null,
      last_four: (raw as any)?.body?.paymentInstrument?.lastFour ?? null,
      card_brand: (raw as any)?.body?.paymentInstrument?.cardBrand ?? null,
    });
  } catch (err: any) {
    console.error('worldpay-create-payment error', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});
