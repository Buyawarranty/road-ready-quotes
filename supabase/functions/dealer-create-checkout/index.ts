// Dealer multi-step checkout: handles "Pay Now" (Stripe) and "Add to Invoice" (direct insert).
// Either path produces a single row in `customers` tagged with dealer_id + purchase_source='dealer'.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';
import { validateAnnualPlan } from '../_shared/dealerAnnualValidation.ts';
import { calculateDealerPromo } from '../_shared/dealerPromoValidation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VehiclePayload {
  reg: string;
  make?: string;
  model?: string;
  year?: string;
  mileage?: string;
}

interface CustomerPayload {
  name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  town: string;
  postcode: string;
}

interface PlanPayload {
  plan_type: 'basic' | 'gold' | 'platinum';
  duration_months: number;
  retail_price: number;
  dealer_price: number;
  claim_limit?: number;
  excess?: number;
  labour_rate?: number;
  product_id?: string;
  pricing_version?: string;
  boost?: boolean;
}

interface RequestBody {
  quote_id?: string;
  dealer_id: string;
  payment_method: 'pay_now' | 'invoice' | 'worldpay';
  vehicle: VehiclePayload;
  customer: CustomerPayload;
  plan: PlanPayload;
  discount_pct: number;
  promo_code?: string;
  preview_only?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) throw new Error('Checkout configuration unavailable.');
    const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate the calling user
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();
    const { dealer_id, payment_method, vehicle, customer, plan, discount_pct } = body;

    // Basic validation
    if (!dealer_id || !payment_method || !vehicle?.reg || !customer?.email || !plan?.plan_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['pay_now', 'invoice', 'worldpay'].includes(payment_method)) {
      return new Response(JSON.stringify({ error: 'Invalid payment_method' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify dealer belongs to this user
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: dealer, error: dealerErr } = await adminClient
      .from('dealers')
      .select('id, user_id, company_name, email, name')
      .eq('id', dealer_id)
      .maybeSingle();

    if (dealerErr || !dealer || dealer.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Dealer not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (plan.pricing_version === 'annual-v1') {
      const { data: config } = await adminClient.from('dealer_admin_plans').select('pricing_matrix, coverage_details')
        .eq('id', plan.product_id || '').eq('is_active', true).single();
      const matrix = config?.pricing_matrix;
      const product = matrix?.brand === 'pandaprotect' ? matrix.terms?.find((p: { months: number }) => p.months === plan.duration_months) : undefined;
      const coverClaim = Number(config?.coverage_details?.claim);
      const validation = validateAnnualPlan(plan, product, { claim: Number.isFinite(coverClaim) && coverClaim > 0 ? coverClaim : undefined, boost: matrix?.boost ?? null });
      if (validation) return new Response(JSON.stringify({ error: validation }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else if (plan.duration_months === 48) {
      return new Response(JSON.stringify({ error: 'Four-year warranty sales are awaiting approval.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const promoCode = String(body.promo_code || '').trim().toUpperCase();
    let promo: { code: string; discount_amount: number; total: number; redemption_id?: string } | null = null;
    if (promoCode) {
      // Discounts can only use a server-validated product price; legacy caller totals are not eligible.
      if (plan.pricing_version !== 'annual-v1') throw new Error('Refresh your quote to apply a promo code to the current warranty pricing.');
      if (payment_method === 'worldpay') throw new Error('Promo codes are available for card or dealer account checkout.');
      const { data: settings, error: settingsError } = await adminClient.from('dealer_admin_discount_codes').select('*').eq('code', promoCode).maybeSingle();
      if (settingsError || !settings) throw new Error('Promo code is unavailable.');
      calculateDealerPromo(plan.dealer_price, settings);
      const { data, error } = await adminClient.rpc('dealer_promo_amount', { p_code: promoCode, p_dealer_id: dealer.id, p_base: plan.dealer_price });
      if (error) throw new Error(error.message);
      promo = data;
    }
    if (body.preview_only) return new Response(JSON.stringify(promo || { total: plan.dealer_price, discount_amount: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (payment_method === 'invoice') {
      const { data: eligible, error } = await userClient.rpc('get_dealer_paylater_eligibility', { p_dealer_id: dealer.id });
      if (error || !eligible?.eligible) throw new Error('Dealer account billing is unavailable. Please pay by card.');
    }
    const payable = promo?.total ?? plan.dealer_price;

    // Build the customer row payload (shared by both paths)
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    const customerRow = {
      name: customer.name,
      email: customer.email.toLowerCase().trim(),
      phone: customer.phone,
      first_name: customer.name.split(' ')[0] || customer.name,
      last_name: customer.name.split(' ').slice(1).join(' ') || null,
      street: customer.address_line1,
      building_name: customer.address_line2 || null,
      town: customer.town,
      postcode: customer.postcode.toUpperCase(),
      country: 'United Kingdom',
      registration_plate: vehicle.reg.toUpperCase(),
      vehicle_make: vehicle.make || null,
      vehicle_model: vehicle.model || null,
      vehicle_year: vehicle.year || null,
      mileage: vehicle.mileage ? parseInt(vehicle.mileage, 10) : null,
      plan_type: plan.plan_type,
      payment_type: String(plan.duration_months),
      claim_limit: Number.isFinite(Number(plan.claim_limit)) && plan.claim_limit ? Number(plan.claim_limit) : null,
      voluntary_excess: Number.isFinite(Number(plan.excess)) && plan.excess != null ? Number(plan.excess) : null,
      labour_rate: Number.isFinite(Number(plan.labour_rate)) && plan.labour_rate ? Number(plan.labour_rate) : null,
      final_amount: payable,
      original_amount: plan.retail_price,
      discount_amount: +(plan.retail_price - payable).toFixed(2),
      discount_code: promo?.code || null,
      status: 'Active',
      payment_status: payment_method === 'invoice' ? 'invoice_pending' : 'pending',
      purchase_source: 'dealer',
      dealer_id: dealer.id,
      signup_date: startDate.toISOString(),
      is_manual_entry: false,
      payment_verified: payment_method === 'invoice',
      brand: 'pandaprotect',
    } as Record<string, unknown>;

    // Helper: upsert dealer customer row by (email, registration_plate) for this dealer.
    // Reuses an existing dealer-owned pending row instead of failing on the unique index.
    const upsertDealerCustomer = async () => {
      const { data: existing } = await adminClient
        .from('customers')
        .select('id, payment_status, dealer_id')
        .eq('email', customerRow.email as string)
        .eq('registration_plate', customerRow.registration_plate as string)
        .eq('dealer_id', dealer.id)
        .maybeSingle();

      if (existing?.id) {
        const { error: updErr } = await adminClient
          .from('customers')
          .update(customerRow)
          .eq('id', existing.id);
        if (updErr) return { error: updErr } as const;
        return { id: existing.id } as const;
      }

      const { data: inserted, error: insertErr } = await adminClient
        .from('customers')
        .insert(customerRow)
        .select('id')
        .single();
      if (insertErr) return { error: insertErr } as const;
      return { id: inserted.id } as const;
    };

    // Fire-and-await a dealer-facing email to the dealer's REGISTERED email.
    const notifyDealer = async (customerId: string, kind: 'invoice' | 'paid') => {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/dealer-warranty-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ customer_id: customerId, kind }),
        });
      } catch (e) {
        console.error('dealer-warranty-email notify failed', e);
      }
    };

    const reservePromo = async (customerId: string) => {
      if (!promo) return null;
      const { data, error } = await adminClient.rpc('dealer_promo_amount', { p_code: promoCode, p_dealer_id: dealer.id, p_base: plan.dealer_price, p_customer_id: customerId });
      if (error) throw new Error(error.message);
      if (Number(data.total) !== payable) throw new Error('Promo code changed. Please apply it again.');
      return data.redemption_id as string;
    };

    // === INVOICE PATH ===
    if (payment_method === 'invoice') {
      // Reserve before issuance, then record this issued invoice as a completed use.
      const invoiceCustomerId = crypto.randomUUID();
      const redemptionId = await reservePromo(invoiceCustomerId);
      const { error: invoiceError } = await adminClient.from('customers').insert({ ...customerRow, id: invoiceCustomerId });
      if (invoiceError) {
        if (redemptionId) await adminClient.from('dealer_promo_redemptions').update({ status: 'cancelled' }).eq('id', redemptionId);
        throw new Error(invoiceError.message);
      }
      if (redemptionId) {
        const invoiceKey = `invoice:${invoiceCustomerId}`;
        const { error: linkError } = await adminClient.from('dealer_promo_redemptions').update({ stripe_session_id: invoiceKey }).eq('id', redemptionId);
        if (linkError) throw new Error(linkError.message);
        const { error } = await adminClient.rpc('complete_dealer_promo', { p_redemption_id: redemptionId, p_session_id: invoiceKey, p_amount: payable });
        if (error) throw new Error(error.message);
      }
      await notifyDealer(invoiceCustomerId, 'invoice');
      return new Response(JSON.stringify({ customer_id: invoiceCustomerId, method: 'invoice' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === WORLDPAY PATH: create the pending customer row, frontend then opens the Worldpay page ===
    if (payment_method === 'worldpay') {
      const result = await upsertDealerCustomer();
      if ('error' in result) {
        console.error('Worldpay pending upsert error', result.error);
        return new Response(JSON.stringify({ error: result.error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ customer_id: result.id, method: 'worldpay' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === PAY NOW PATH (Stripe) ===
    if (!STRIPE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to enable Pay Now.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-11-20.acacia' });

    // Upsert dealer customer row (handles re-attempts after a cancelled checkout)
    const result = await upsertDealerCustomer();
    if ('error' in result) {
      console.error('Pending customer upsert error', result.error);
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pendingCustomerId = result.id;
    const redemptionId = await reservePromo(pendingCustomerId);

    const origin = req.headers.get('origin') || 'https://www.pandaprotect.co.uk';
    const embedded = (body as { embedded?: boolean }).embedded === true;
    const returnUrl = `${origin}/dealer-portal/quote/confirmation?id=${pendingCustomerId}&method=pay_now&session_id={CHECKOUT_SESSION_ID}`;
    let session;
    try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      ...(embedded ? { ui_mode: 'embedded' as const, return_url: returnUrl } : { success_url: returnUrl, cancel_url: `${origin}/dealer-portal/quote/checkout` }),
      payment_method_types: ['card'],
      customer_email: dealer.email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Dealer Warranty · ${plan.plan_type.toUpperCase()} · ${plan.duration_months}mo`,
              description: `${vehicle.reg} for ${customer.name}`,
            },
            unit_amount: Math.round(payable * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        dealer_id: dealer.id,
        customer_id: pendingCustomerId,
        plan_type: plan.plan_type,
        plan_id: plan.plan_type,
        duration_months: String(plan.duration_months),
        purchase_source: 'dealer',
        discount_pct: String(discount_pct),
        promo_redemption_id: redemptionId || '',
        dealer_promo_code: promo?.code || '',
        dealer_base_amount: String(plan.dealer_price),
        dealer_final_amount: String(payable),
      },
    });
    } catch (error) {
      if (redemptionId) await adminClient.from('dealer_promo_redemptions').update({ status: 'cancelled' }).eq('id', redemptionId);
      throw error;
    }
    const { error: sessionError } = await adminClient.from('customers').update({ stripe_session_id: session.id }).eq('id', pendingCustomerId);
    if (sessionError) { await stripe.checkout.sessions.expire(session.id); throw new Error(sessionError.message); }
    if (redemptionId) {
      const { error } = await adminClient.from('dealer_promo_redemptions').update({ stripe_session_id: session.id }).eq('id', redemptionId);
      if (error) { await stripe.checkout.sessions.expire(session.id); throw new Error(error.message); }
    }

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        client_secret: session.client_secret,
        customer_id: pendingCustomerId,
        session_id: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('dealer-create-checkout error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
