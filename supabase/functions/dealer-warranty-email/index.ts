// Internal purchase email: sends the dealer receipt and the customer-safe warranty confirmation.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { resendFetch } from '../_shared/emailPolish.ts';
import { makeClaimUrl, resolveBrand, transactionalEmailIdentity, type Brand } from '../_shared/brand.ts';
import { displayWarrantyPlanName } from '../_shared/warrantyPlanDisplay.ts';
import { dealerPurchaseRecipients } from '../_shared/dealerSaleFulfilment.ts';
import { buildDealerWarrantyEmail, DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE } from '../_shared/dealerWarrantyEmail.ts';
import { loadPandaWarrantyAttachments } from '../_shared/dealerWarrantyDocuments.ts';
import { ensureCustomerPortalLogin, logCustomerEmail } from '../_shared/customerPortalLogin.ts';
import { buildDealerFreeWarrantyEmail, loadDealerFreeOfferProgress } from '../_shared/dealerFreeWarrantyEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const money = (value: number) => `£${Number(value || 0).toFixed(2)}`;
const esc = (value: unknown) => String(value ?? '').replace(/[<>&"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[character] as string));

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
      .select('id, name, email, registration_plate, vehicle_make, vehicle_model, vehicle_year, plan_type, payment_type, final_amount, payment_status, signup_date, dealer_id, warranty_number, discount_code, phone, flat_number, building_name, building_number, street, town, county, postcode')
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
    const isIntroFree = kind === 'paid' && (['3+3 INTRO','BOGOF FREE'].includes(c.discount_code) || amount === 0);
    const vehicle = [c.vehicle_make, c.vehicle_model, c.vehicle_year].filter(Boolean).join(' ');
    const ref = String(c.warranty_number || String(c.id).replace(/-/g, '').slice(0, 8).toUpperCase());
    const planDisplayName = displayWarrantyPlanName(c.plan_type, 'Platinum').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

    const dealerRows = `
      <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(ref)}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Customer</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(c.name || '—')}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Vehicle</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(c.registration_plate || '—')}${vehicle ? ` · ${esc(vehicle)}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(planDisplayName)} · ${esc(c.payment_type || '')} months</td></tr>
      <tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#f97316">${isIntroFree ? 'Free — buy one get one free' : money(amount)}</td></tr>`;
    const dealerSubject = kind === 'invoice'
      ? `Invoice — warranty for ${c.registration_plate || 'your customer'} (${money(amount)})`
      : isIntroFree ? `Free warranty activated — ${c.registration_plate || 'your customer'}` : `Payment received — warranty for ${c.registration_plate || 'your customer'}`;
    const dealerIntro = kind === 'invoice'
      ? `This warranty has been added to your ${esc(brand.name)} dealer account and will appear on your next invoice. Amount outstanding: <strong>${money(amount)}</strong>.`
      : isIntroFree ? 'Your free warranty (buy one, get the next one free) is now active at no charge.' : `Thanks — your payment of <strong>${money(amount)}</strong> has been received and the warranty is now active.`;
    const dealerHtml = `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:620px;margin:0 auto;padding:24px">
        <img src="${brand.logoUrl}" alt="${esc(brand.name)}" width="220" style="display:block;width:220px;max-width:100%;height:auto;margin-bottom:24px;border:0" />
        <h1 style="color:#f97316;font-size:22px;margin:0 0 6px">${kind === 'invoice' ? 'Warranty invoiced' : isIntroFree ? 'Free warranty activated' : 'Warranty confirmed'}</h1>
        <p style="font-size:13px;color:#666;margin:0 0 18px">${esc(dealer?.company_name || dealer?.name || 'Dealer account')} · ${new Date().toLocaleDateString('en-GB')}</p>
        <p style="font-size:14px;line-height:1.6">${dealerIntro}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #eee">${dealerRows}</table>
        <p style="font-size:13px;color:#666;margin-top:22px">You can view and manage this warranty in your dealer portal.</p>
        <p style="font-size:13px;color:#666;margin-top:16px"><strong>Need to make a claim?</strong> Your customer can visit our <a href="${makeClaimUrl(brand)}" style="color:${brand.accentColor};font-weight:600">Make a claim page</a> or email <a href="mailto:${brand.claimsEmail}" style="color:${brand.accentColor}">${brand.claimsEmail}</a>, quoting the warranty reference.</p>
        <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:14px">${esc(brand.name)} · ${brand.supportEmail}</p>
      </div>`;

    const freeProgress = isIntroFree && c.discount_code === 'BOGOF FREE'
      ? await loadDealerFreeOfferProgress({
        available: async () => {
          const { data, error } = await supabase.rpc('dealer_bogof_remaining', { p_dealer_id: c.dealer_id }).abortSignal(AbortSignal.timeout(2500));
          if (error || typeof data !== 'number') throw new Error('Free balance could not be checked');
          return data;
        },
        redemptions: async () => {
          const { data, error } = await supabase.from('dealer_intro_free_redemptions').select('status').eq('dealer_id', c.dealer_id).abortSignal(AbortSignal.timeout(2500));
          if (error || !data) throw new Error('Free redemptions could not be checked');
          return data;
        },
        enabled: async () => {
          const { data, error } = await supabase.from('dealer_bogof_settings').select('enabled').eq('id', 1).single().abortSignal(AbortSignal.timeout(2500));
          if (error || typeof data?.enabled !== 'boolean') throw new Error('Offer status could not be checked');
          return data.enabled;
        },
      }) : null;
    if (isIntroFree && c.discount_code === 'BOGOF FREE' && !freeProgress) console.warn('Free receipt balance unavailable', c.id);
    const dealerEmail = isIntroFree
      ? buildDealerFreeWarrantyEmail({ brand, customer: c, dealer: dealer || { id: c.dealer_id }, to: recipients.dealer, progress: freeProgress })
      : { ...transactionalEmailIdentity(brand, 'warranty_purchase'), to: [recipients.dealer], subject: dealerSubject, html: dealerHtml };

    const dealerResponse = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify(dealerEmail),
    });
    const dealerPayload = await dealerResponse.json().catch(() => ({}));
    if (!dealerResponse.ok) {
      console.error('Dealer Resend error', dealerResponse.status, dealerPayload);
      return json({ success: false, dealer_sent: false, customer_sent: false, error: (dealerPayload as any)?.message || 'Failed to send dealer email' }, dealerResponse.status);
    }

    if (!recipients.customer) return json({ success: true, dealer_sent: true, customer_sent: false, customer_skipped: 'no_valid_email', kind });

    // Use the same Admin-controlled template and document block as the dealer preview.
    // The customer payload deliberately excludes trade price, discount and profit information.
    const { data: storedTemplate, error: templateError } = await supabase
      .from('dealer_warranty_email_templates')
      .select('subject, heading, introduction, closing_text')
      .eq('template_key', 'dealer_warranty')
      .maybeSingle();
    if (templateError) throw templateError;
    let login: { email: string; password: string | null } | null = null;
    try { login = await ensureCustomerPortalLogin(supabase, recipients.customer, { policy_number: c.warranty_number, customer_id: c.id }); }
    catch (error) { console.error('customer login setup failed', error); }
    const customerEmail = buildDealerWarrantyEmail({
      login,
      brand,
      template: storedTemplate || DEFAULT_DEALER_WARRANTY_EMAIL_TEMPLATE,
      customer: c,
      dealer: dealer || { id: c.dealer_id },
      recipientType: 'customer',
      to: recipients.customer,
    });
    try {
      customerEmail.attachments = await loadPandaWarrantyAttachments();
    } catch (error) {
      console.error('dealer-warranty-email PDF loading error', error);
      return json({ success: false, dealer_sent: true, customer_sent: false, error: 'The warranty PDFs could not be loaded, so the customer email was not sent.' }, 502);
    }
    const customerResponse = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify(customerEmail),
    });
    const customerPayload = await customerResponse.json().catch(() => ({}));
    await logCustomerEmail(supabase, { to: recipients.customer, subject: customerEmail.subject, customerId: c.id, ok: customerResponse.ok, providerId: (customerPayload as any)?.id, error: customerResponse.ok ? null : (customerPayload as any)?.message, kind: 'warranty_active' });
    if (!customerResponse.ok) {
      console.error('Customer Resend error', customerResponse.status, customerPayload);
      return json({ success: false, dealer_sent: true, customer_sent: false, error: (customerPayload as any)?.message || 'Customer email could not be sent' });
    }

    return json({ success: true, dealer_sent: true, customer_sent: true, kind, attachments_included: customerEmail.attachments?.length || 0 });
  } catch (error: any) {
    console.error('dealer-warranty-email error', error);
    return json({ success: false, error: error?.message || 'Internal error' }, 500);
  }
});
