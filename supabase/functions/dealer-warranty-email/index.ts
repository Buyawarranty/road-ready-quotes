// Internal purchase email: sends the dealer receipt and the customer-safe warranty confirmation.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { resendFetch } from '../_shared/emailPolish.ts';
import { makeClaimUrl, resolveBrand, transactionalEmailIdentity, type Brand } from '../_shared/brand.ts';
import { displayWarrantyPlanName } from '../_shared/warrantyPlanDisplay.ts';
import { dealerPurchaseRecipients } from '../_shared/dealerSaleFulfilment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const money = (value: number) => `£${Number(value || 0).toFixed(2)}`;
const esc = (value: unknown) => String(value ?? '').replace(/[<>&"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[character] as string));
const fmt = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-GB') : '—';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const brand: Brand = resolveBrand(req, { force: 'pandaprotect' });
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) return json({ error: 'Unauthorized' }, 401);
    if (!RESEND_API_KEY) return json({ success: false, error: 'Email is not configured' }, 500);

    let body: { customer_id?: string; kind?: string };
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
    const customerId = String(body.customer_id || '').trim();
    if (!customerId) return json({ error: 'customer_id is required' }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: c, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, registration_plate, vehicle_make, vehicle_model, vehicle_year, plan_type, payment_type, final_amount, payment_status, signup_date, dealer_id, warranty_number, discount_code')
      .eq('id', customerId)
      .eq('brand', 'pandaprotect')
      .maybeSingle();
    if (customerError || !c) return json({ error: 'Warranty not found' }, 404);
    if (!c.dealer_id) return json({ error: 'Not a dealer warranty' }, 400);

    const { data: dealer } = await supabase.from('dealers').select('id, email, name, company_name').eq('id', c.dealer_id).maybeSingle();
    const recipients = dealerPurchaseRecipients(dealer?.email, c.email);
    if (!recipients.dealer) return json({ error: 'Dealer has no registered email' }, 400);

    const kind = body.kind === 'invoice' || c.payment_status === 'invoice_pending' ? 'invoice' : 'paid';
    const amount = Number(c.final_amount ?? 0);
    const isIntroFree = kind === 'paid' && (c.discount_code === '3+3 INTRO' || amount === 0);
    const vehicle = [c.vehicle_make, c.vehicle_model, c.vehicle_year].filter(Boolean).join(' ');
    const ref = String(c.warranty_number || String(c.id).replace(/-/g, '').slice(0, 8).toUpperCase());
    const planDisplayName = displayWarrantyPlanName(c.plan_type, 'Platinum').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    const months = Number.parseInt(String(c.payment_type || ''), 10);
    const endDate = c.signup_date && Number.isFinite(months)
      ? (() => { const date = new Date(c.signup_date); date.setMonth(date.getMonth() + months); return date.toISOString(); })()
      : null;

    const dealerRows = `
      <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(ref)}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Customer</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(c.name || '—')}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Vehicle</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(c.registration_plate || '—')}${vehicle ? ` · ${esc(vehicle)}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(planDisplayName)} · ${esc(c.payment_type || '')} months</td></tr>
      <tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#f97316">${isIntroFree ? 'Free with 3+3 offer' : money(amount)}</td></tr>`;
    const dealerSubject = kind === 'invoice'
      ? `Invoice — warranty for ${c.registration_plate || 'your customer'} (${money(amount)})`
      : isIntroFree ? `3+3 free warranty activated — ${c.registration_plate || 'your customer'}` : `Payment received — warranty for ${c.registration_plate || 'your customer'}`;
    const dealerIntro = kind === 'invoice'
      ? `This warranty has been added to your ${esc(brand.name)} dealer account and will appear on your next invoice. Amount outstanding: <strong>${money(amount)}</strong>.`
      : isIntroFree ? 'Your 3+3 introductory warranty is now active at no charge.' : `Thanks — your payment of <strong>${money(amount)}</strong> has been received and the warranty is now active.`;
    const dealerHtml = `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:620px;margin:0 auto;padding:24px">
        <img src="${brand.logoUrl}" alt="${esc(brand.name)}" width="220" style="display:block;width:220px;max-width:100%;height:auto;margin-bottom:24px;border:0" />
        <h1 style="color:#f97316;font-size:22px;margin:0 0 6px">${kind === 'invoice' ? 'Warranty invoiced' : isIntroFree ? '3+3 free warranty activated' : 'Warranty confirmed'}</h1>
        <p style="font-size:13px;color:#666;margin:0 0 18px">${esc(dealer?.company_name || dealer?.name || 'Dealer account')} · ${new Date().toLocaleDateString('en-GB')}</p>
        <p style="font-size:14px;line-height:1.6">${dealerIntro}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #eee">${dealerRows}</table>
        <p style="font-size:13px;color:#666;margin-top:22px">You can view and manage this warranty in your dealer portal.</p>
        <p style="font-size:13px;color:#666;margin-top:16px"><strong>Need to make a claim?</strong> Your customer can visit our <a href="${makeClaimUrl(brand)}" style="color:${brand.accentColor};font-weight:600">Make a claim page</a> or email <a href="mailto:${brand.claimsEmail}" style="color:${brand.accentColor}">${brand.claimsEmail}</a>, quoting the warranty reference.</p>
        <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:14px">${esc(brand.name)} · ${brand.supportEmail}</p>
      </div>`;

    const dealerResponse = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ ...transactionalEmailIdentity(brand, 'warranty_purchase'), to: [recipients.dealer], subject: dealerSubject, html: dealerHtml }),
    });
    const dealerPayload = await dealerResponse.json().catch(() => ({}));
    if (!dealerResponse.ok) {
      console.error('Dealer Resend error', dealerResponse.status, dealerPayload);
      return json({ success: false, dealer_sent: false, customer_sent: false, error: (dealerPayload as any)?.message || 'Failed to send dealer email' }, dealerResponse.status);
    }

    if (!recipients.customer) return json({ success: true, dealer_sent: true, customer_sent: false, customer_skipped: 'no_valid_email', kind });

    // Customer copy deliberately excludes trade price, discount and profit information.
    const customerRows = `
      <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(ref)}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Vehicle</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(c.registration_plate || '—')}${vehicle ? ` · ${esc(vehicle)}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(planDisplayName)} · ${esc(c.payment_type || '')} months</td></tr>
      <tr><td style="padding:8px 0;color:#666">Start date</td><td style="padding:8px 0;text-align:right;font-weight:600">${fmt(c.signup_date)}</td></tr>
      ${endDate ? `<tr><td style="padding:8px 0;color:#666">Expiry date</td><td style="padding:8px 0;text-align:right;font-weight:600">${fmt(endDate)}</td></tr>` : ''}`;
    const customerHtml = `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:620px;margin:0 auto;padding:24px">
        <h1 style="color:#f97316;font-size:22px;margin:0 0 6px">Your warranty is confirmed</h1>
        <p style="font-size:13px;color:#666;margin:0 0 18px">Provided by ${esc(dealer?.company_name || dealer?.name || 'your dealer')} · ${new Date().toLocaleDateString('en-GB')}</p>
        <p style="font-size:14px;line-height:1.6">Hi ${esc(c.name || 'there')},</p>
        <p style="font-size:14px;line-height:1.6">${esc(dealer?.company_name || dealer?.name || 'Your dealer')} has arranged a ${esc(brand.name)} warranty for your vehicle. Here are your warranty details:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #eee">${customerRows}</table>
        <p style="font-size:13px;color:#666;margin-top:22px"><strong>Need to make a claim?</strong><br />Visit our <a href="${makeClaimUrl(brand)}" style="color:${brand.accentColor};font-weight:600">Make a claim page</a> to start your claim online. You can also email <a href="mailto:${brand.claimsEmail}" style="color:${brand.accentColor}">${brand.claimsEmail}</a>. Please quote your warranty reference.</p>
        <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:14px">${esc(brand.name)} · ${brand.supportEmail}</p>
      </div>`;
    const customerResponse = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ ...transactionalEmailIdentity(brand, 'warranty_purchase'), to: [recipients.customer], subject: `Your vehicle warranty — ${c.registration_plate || ref}`, html: customerHtml }),
    });
    const customerPayload = await customerResponse.json().catch(() => ({}));
    if (!customerResponse.ok) {
      console.error('Customer Resend error', customerResponse.status, customerPayload);
      return json({ success: false, dealer_sent: true, customer_sent: false, error: (customerPayload as any)?.message || 'Customer email could not be sent' });
    }

    return json({ success: true, dealer_sent: true, customer_sent: true, kind });
  } catch (error: any) {
    console.error('dealer-warranty-email error', error);
    return json({ success: false, error: error?.message || 'Internal error' }, 500);
  }
});
