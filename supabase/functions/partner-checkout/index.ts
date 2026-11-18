// Public partner checkout: a CRM supplier's website links customers here.
// The customer pays Panda Protect the standard retail price; no login is needed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=denonext';
import { z } from 'npm:zod@3.23.8';
import { normalizeCheckoutEmail, normalizeCheckoutPlate } from '../_shared/dealerCheckoutDuplicate.ts';
import { sendPartnerWebhook } from '../_shared/partnerWebhook.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

const Base = z.object({ partner: z.string().trim().min(2).max(80), dealer: z.string().uuid() });
const Checkout = Base.extend({
  action: z.literal('checkout'),
  months: z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(48)]),
  boost: z.boolean().default(false),
  vehicle: z.object({ reg: z.string().trim().min(2).max(10), make: z.string().max(60).optional(), model: z.string().max(80).optional(), year: z.string().max(4).optional(), mileage: z.number().int().min(0).max(150000) }),
  customer: z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), phone: z.string().trim().min(7).max(20), address_line1: z.string().trim().min(2).max(160), town: z.string().trim().min(2).max(80), postcode: z.string().trim().min(5).max(9) }),
  reference: z.string().max(120).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const raw = await req.json().catch(() => ({}));
    const base = Base.safeParse(raw);
    if (!base.success) return reply({ error: 'This warranty link is incomplete. Please ask the seller for a new link.' }, 400);

    const { data: partner } = await admin.from('partners').select('id, name, slug, mode, status').eq('slug', base.data.partner.toLowerCase()).maybeSingle();
    if (!partner || partner.status !== 'active') return reply({ error: 'This warranty link is not active right now.' }, 404);
    const { data: link } = await admin.from('partner_dealers').select('id').eq('partner_id', partner.id).eq('dealer_id', base.data.dealer).maybeSingle();
    const { data: dealer } = await admin.from('dealers').select('id, company_name, name, status').eq('id', base.data.dealer).maybeSingle();
    if (!link || !dealer || dealer.status !== 'active') return reply({ error: 'This seller is not set up for Panda Protect warranties yet.' }, 404);

    const { data: plan } = await admin.from('dealer_admin_plans').select('id, pricing_matrix, coverage_details')
      .eq('is_active', true).contains('pricing_matrix', { brand: 'pandaprotect', version: 'annual-v1' }).single();
    if (!plan) return reply({ error: 'Warranty prices are unavailable. Please try again shortly.' }, 503);
    const matrix = plan.pricing_matrix as any;
    const terms = (matrix.terms || []).filter((t: any) => t.active && (t.months !== 48 || t.approvals_complete === true))
      .map((t: any) => {
        const b = matrix.boost?.active ? (matrix.boost.terms || []).find((x: any) => x.months === t.months) : null;
        return { months: t.months, price: Number(t.retail_price), boost_price: b ? Number(b.retail_price) : null };
      });
    const cover = { claim: Number(plan.coverage_details?.claim) || 0, boost_claim: matrix.boost?.active ? Number(matrix.boost.claim_limit) : null, excess: Number(plan.coverage_details?.excess) || 0, labour: Number(plan.coverage_details?.labour) || 0 };

    if (raw.action !== 'checkout') {
      return reply({ partner: { name: partner.name, mode: partner.mode }, dealer: { name: dealer.company_name || dealer.name }, terms, cover });
    }

    const parsed = Checkout.safeParse(raw);
    if (!parsed.success) return reply({ error: 'Please check the details and try again.', fields: parsed.error.flatten().fieldErrors }, 400);
    const { months, boost, vehicle, customer } = parsed.data;
    const term = terms.find((t: any) => t.months === months);
    if (!term) return reply({ error: 'That warranty length is not available.' }, 400);
    if (boost && term.boost_price == null) return reply({ error: 'The claim boost is not available for that length.' }, 400);
    const year = Number(vehicle.year);
    if (year && new Date().getUTCFullYear() - year > 15) return reply({ error: 'Protection is designed for vehicles up to 15 years old and 150,000 miles.' }, 400);
    const price = +(term.price + (boost ? term.boost_price : 0)).toFixed(2);

    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const row = {
      name: customer.name, email: normalizeCheckoutEmail(customer.email), phone: customer.phone,
      first_name: customer.name.split(' ')[0], last_name: customer.name.split(' ').slice(1).join(' ') || null,
      street: customer.address_line1, town: customer.town, postcode: customer.postcode.toUpperCase(), country: 'United Kingdom',
      registration_plate: normalizeCheckoutPlate(vehicle.reg), vehicle_make: vehicle.make || null, vehicle_model: vehicle.model || null,
      vehicle_year: vehicle.year || null, mileage: vehicle.mileage, plan_type: 'gold', payment_type: String(months),
      claim_limit: boost ? cover.boost_claim : cover.claim, voluntary_excess: cover.excess, labour_rate: cover.labour,
      final_amount: price, original_amount: price, discount_amount: 0,
      status: 'Pending', payment_status: 'pending', payment_verified: false,
      purchase_source: 'dealer', dealer_id: dealer.id, partner_id: partner.id, signup_date: startDate.toISOString(),
      is_manual_entry: false, brand: 'pandaprotect',
    };

    // Test partners never take money or create warranties: they get a sample update instead.
    if (partner.mode === 'test') {
      await sendPartnerWebhook(admin, partner.id, 'warranty.test', { registration: row.registration_plate, term_months: months, amount: price, currency: 'GBP', reference: parsed.data.reference || null });
      return reply({ test: true, amount: price });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return reply({ error: 'Card payments are unavailable right now.' }, 503);
    const { data: existing } = await admin.from('customers').select('id, payment_status, partner_id')
      .eq('email', row.email).eq('registration_plate', row.registration_plate).eq('brand', 'pandaprotect')
      .or('is_deleted.is.null,is_deleted.eq.false').limit(1).maybeSingle();
    if (existing && existing.payment_status === 'paid') return reply({ error: 'This vehicle already has a Panda Protect warranty for this email address.' }, 409);
    let customerId: string;
    if (existing && existing.partner_id === partner.id) {
      customerId = existing.id;
      const { error } = await admin.from('customers').update(row).eq('id', customerId);
      if (error) throw new Error(error.message);
    } else if (existing) {
      return reply({ error: 'A warranty for this vehicle is already in progress. Please contact Panda Protect on 0330 229 6547.' }, 409);
    } else {
      const { data, error } = await admin.from('customers').insert(row).select('id').single();
      if (error) throw new Error(error.code === '23505' ? 'A warranty for this vehicle is already in progress.' : error.message);
      customerId = data.id;
    }

    const origin = req.headers.get('origin') || 'https://pandaprotect.co.uk';
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', expires_at: Math.floor(Date.now() / 1000) + 30 * 60, payment_method_types: ['card'], customer_email: row.email,
      success_url: `${origin}/partner/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/partner/checkout?p=${partner.slug}&d=${dealer.id}&reg=${encodeURIComponent(row.registration_plate)}`,
      line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: Math.round(price * 100), product_data: { name: `Panda Protect Platinum Warranty · ${months / 12} ${months === 12 ? 'year' : 'years'}${boost ? ' · claim boost' : ''}`, description: `${row.registration_plate} for ${customer.name}` } } }],
      metadata: { source: 'dealer_journey', partner_id: partner.id, partner_reference: parsed.data.reference || '', dealer_id: dealer.id, customer_id: customerId, plan_type: 'gold', plan_id: 'gold', duration_months: String(months), purchase_source: 'partner', dealer_quote_id: '' },
    });
    const { error: sErr } = await admin.from('customers').update({ stripe_session_id: session.id }).eq('id', customerId);
    if (sErr) { await stripe.checkout.sessions.expire(session.id); throw new Error(sErr.message); }
    return reply({ checkout_url: session.url });
  } catch (e) {
    console.error('partner-checkout error', e);
    return reply({ error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }, 500);
  }
});
