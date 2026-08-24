// Creates a Worldpay Access hosted payment page (MOTO / virtual terminal or pay-by-link)
// and records the attempt in public.worldpay_transactions.

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
  flow?: 'moto' | 'link';
  amount_pence?: number;
  description?: string;
  currency?: string;
  sales_lead_id?: string | null;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  success_url?: string | null;
  cancel_url?: string | null;
  billing?: Billing | null;
}

// Worldpay rejects unexpected characters; keep it to plain address text.
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
  // Worldpay requires address1 + city + postalCode + countryCode together.
  if (!address1 || !city || !postalCode) return undefined;

  const out: Record<string, string> = {
    address1,
    city,
    postalCode,
    countryCode: (clean(billing.country_code, 2) || 'GB').toUpperCase(),
  };
  const address2 = clean(billing.address2);
  if (address2) out.address2 = address2;
  const address3 = clean(billing.address3);
  if (address3) out.address3 = address3;
  const first = clean(billing.first_name, 30);
  if (first) out.firstName = first;
  const last = clean(billing.last_name, 30);
  if (last) out.lastName = last;
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
    const ENVIRONMENT = (Deno.env.get('WORLDPAY_ENVIRONMENT') ?? 'sandbox').toLowerCase() === 'live'
      ? 'live'
      : 'sandbox';

    if (!USERNAME || !PASSWORD) {
      return json(
        { error: 'Worldpay is not configured yet. Add WORLDPAY_USERNAME, WORLDPAY_PASSWORD and WORLDPAY_ENTITY.' },
        503,
      );
    }

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const flow = body.flow === 'link' ? 'link' : 'moto';
    const amountPence = Math.round(Number(body.amount_pence ?? 0));
    if (!Number.isFinite(amountPence) || amountPence <= 0) {
      return json({ error: 'amount_pence must be a positive number' }, 400);
    }
    const currency = (body.currency || 'GBP').toUpperCase();
    const description = (body.description || 'Vehicle warranty payment').slice(0, 200);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create the pending transaction row first so we have a reference to poll on.
    const { data: txn, error: txnErr } = await supabase
      .from('worldpay_transactions')
      .insert({
        flow,
        amount_pence: amountPence,
        currency,
        description,
        environment: ENVIRONMENT,
        status: 'pending',
        sales_lead_id: body.sales_lead_id || null,
        customer_id: body.customer_id || null,
        customer_email: body.customer_email || null,
        customer_phone: body.customer_phone || null,
      })
      .select('id')
      .single();

    if (txnErr || !txn) {
      console.error('worldpay txn insert error', txnErr);
      return json({ error: txnErr?.message || 'Could not create transaction' }, 500);
    }

    const transactionReference = `PP-${txn.id}`;
    const base = ENVIRONMENT === 'live'
      ? 'https://access.worldpay.com'
      : 'https://try.access.worldpay.com';

    const origin = req.headers.get('origin') || 'https://pandaprotect.co.uk';
    const successUrl = body.success_url || `${origin}/payment-received?ref=${transactionReference}`;
    const cancelUrl = body.cancel_url || `${origin}/payment-fallback?ref=${transactionReference}`;

    const auth = 'Basic ' + btoa(`${USERNAME}:${PASSWORD}`);
    const billingAddress = buildBillingAddress(body.billing);

    const buildPayload = (withBilling: boolean) => {
      const payload: Record<string, unknown> = {
        transactionReference,
        merchant: { entity: ENTITY },
        narrative: {
          line1: (String(description || 'Panda Protect')
            .replace(/[^a-zA-Z0-9\-., ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 24)) || 'Panda Protect',
        },
        value: { currency, amount: amountPence },
        resultURLs: {
          successURL: successUrl,
          pendingURL: successUrl,
          failureURL: cancelUrl,
          errorURL: cancelUrl,
          cancelURL: cancelUrl,
          expiryURL: cancelUrl,
        },
      };
      if (withBilling && billingAddress) {
        payload.billingAddress = billingAddress;
        const email = body.customer_email ? String(body.customer_email).slice(0, 120) : '';
        if (email) payload.shopper = { shopperEmailAddress: email };
      }
      return JSON.stringify(payload);
    };

    const wpBody = buildPayload(true);


    // Worldpay Access exposes hosted payment pages at /payment_pages (some
    // older accounts use /paymentPages) — try both before failing.
    const wpHeaders = {
      Authorization: auth,
      'Content-Type': 'application/vnd.worldpay.payment_pages-v1.hal+json',
      Accept: 'application/vnd.worldpay.payment_pages-v1.hal+json',
    };
    let wpRes = await fetch(`${base}/payment_pages`, { method: 'POST', headers: wpHeaders, body: wpBody });
    if (wpRes.status === 404) {
      wpRes = await fetch(`${base}/paymentPages`, { method: 'POST', headers: wpHeaders, body: wpBody });
    }

    const raw = await wpRes.json().catch(() => ({}));

    if (!wpRes.ok) {
      console.error('Worldpay API error', wpRes.status, raw);
      await supabase
        .from('worldpay_transactions')
        .update({ status: 'failed', last_error: JSON.stringify(raw).slice(0, 1000), raw_response: raw })
        .eq('id', txn.id);
      return json(
        {
          error: (raw as any)?.message || 'Worldpay rejected the request',
          worldpay_status: wpRes.status,
          environment: ENVIRONMENT,
          entity: ENTITY,
        },
        502,
      );
    }

    const paymentUrl: string | undefined = (raw as any)?.url || (raw as any)?._links?.['payment_pages:url']?.href;
    if (!paymentUrl) {
      await supabase
        .from('worldpay_transactions')
        .update({ status: 'failed', last_error: 'No payment URL returned', raw_response: raw })
        .eq('id', txn.id);
      return json({ error: 'Worldpay did not return a payment URL' }, 502);
    }

    await supabase
      .from('worldpay_transactions')
      .update({ worldpay_link_url: paymentUrl, raw_response: raw, last_event: 'page_created' })
      .eq('id', txn.id);

    return json({
      transaction_id: txn.id,
      transaction_reference: transactionReference,
      payment_url: paymentUrl,
      environment: ENVIRONMENT,
    });
  } catch (err: any) {
    console.error('worldpay-create-payment-page error', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});
