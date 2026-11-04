import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

/**
 * Read-only check: does the saved Stripe publishable key belong to the same
 * Stripe account as the saved secret key? A mismatch means dealer card
 * checkout silently fails, so this reports the account behind each key and
 * whether a PaymentIntent created by the secret key can be reached with the
 * publishable key. Nothing is charged; the intent is cancelled at the end.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE = 'https://api.stripe.com/v1'

const secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const publishableKey =
  Deno.env.get('VITE_STRIPE_PUBLISHABLE_KEY') ?? Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? ''

const form = (data: Record<string, string>) => {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(data)) body.set(k, v)
  return body
}

const call = async (
  path: string,
  key: string,
  body?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown> }> => {
  const res = await fetch(`${STRIPE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? form(body).toString() : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, json }
}

const messageOf = (json: Record<string, unknown>) => {
  const err = json.error as Record<string, unknown> | undefined
  return String(err?.message ?? err?.code ?? JSON.stringify(json).slice(0, 200))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!secretKey || !publishableKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        reason: 'missing_key',
        secret_key_present: !!secretKey,
        publishable_key_present: !!publishableKey,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const report: Record<string, unknown> = {
    ok: false,
    publishable_prefix: `${publishableKey.slice(0, 7)}...(${publishableKey.length} chars)`,
    publishable_mode: publishableKey.startsWith('pk_live_')
      ? 'live'
      : publishableKey.startsWith('pk_test_')
        ? 'test'
        : 'unknown',
  }

  const account = await call('/account', secretKey)
  report.secret_key_account = {
    status: account.status,
    id: (account.json as Record<string, unknown>).id ?? null,
    name: (account.json as Record<string, unknown>).business_profile ??
      (account.json as Record<string, unknown>).settings ??
      null,
    charges_enabled: (account.json as Record<string, unknown>).charges_enabled ?? null,
    country: (account.json as Record<string, unknown>).country ?? null,
  }

  // A publishable key cannot read the account directly; tokenising a card is the
  // cheapest way to prove it is a real key for a live-mode account.
  const token = await call('/tokens', publishableKey, {
    'card[number]': '0000000000000000',
    'card[exp_month]': '12',
    'card[exp_year]': '2035',
    'card[cvc]': '123',
  })
  report.publishable_key_token_probe = {
    status: token.status,
    message: messageOf(token.json),
  }

  // Create an intent with the secret key, then try to reach it with the
  // publishable key. A wrong-account key cannot see this object.
  const intent = await call('/payment_intents', secretKey, {
    amount: '100',
    currency: 'gbp',
    'payment_method_types[0]': 'card',
    description: 'Panda Protect publishable key check',
  })
  const intentId = (intent.json as Record<string, unknown>).id as string | undefined
  report.intent_created = { status: intent.status, id: intentId ?? null }

  if (intentId) {
    const reached = await call(`/payment_intents/${intentId}`, publishableKey)
    report.publishable_can_read_intent = {
      status: reached.status,
      message: messageOf(reached.json),
    }

    const confirmed = await call(`/payment_intents/${intentId}/confirm`, publishableKey, {
      'payment_method_data[type]': 'card',
      'payment_method_data[card][number]': '0000000000000000',
      'payment_method_data[card][exp_month]': '12',
      'payment_method_data[card][exp_year]': '2035',
      'payment_method_data[card][cvc]': '123',
    })
    report.publishable_confirm_attempt = {
      status: confirmed.status,
      message: messageOf(confirmed.json),
    }

    await call(`/payment_intents/${intentId}/cancel`, secretKey)
    report.intent_cancelled = true
  }

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
