import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { resolveBrand, brandFrom } from '../_shared/brand.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!url || !key || !resendKey) throw new Error('Quote email is unavailable.');
    const db = createClient(url, key);
    const { data: { user } } = await db.auth.getUser(req.headers.get('Authorization')?.replace(/^Bearer /, '') || '');
    if (!user) return new Response(JSON.stringify({ error: 'Please sign in.' }), { status: 401, headers });
    const { quote_id, email } = await req.json();
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid customer email address.');
    const { data: dealer } = await db.from('dealers').select('id,company_name').eq('user_id', user.id).single();
    if (!dealer) return new Response(JSON.stringify({ error: 'Dealer account required.' }), { status: 403, headers });
    const { data: quote } = await db.from('dealer_quotes').select('id,customer_name,vehicle_reg,vehicle_make,vehicle_model,warranty_duration,retail_price,plan_options').eq('id', quote_id).eq('dealer_id', dealer.id).single();
    if (!quote || Number(quote.warranty_duration) === 48) throw new Error('Select an approved warranty quote.');
    const brand = resolveBrand(req, { force: 'pandaprotect' });
    const options = quote.plan_options || {};
    const safe = { vehicle: { reg: quote.vehicle_reg, make: quote.vehicle_make, model: quote.vehicle_model }, coverTitle: 'Comprehensive Warranty', coverSubtitle: `Quote ${quote.id.slice(0, 8).toUpperCase()}`, price: Number(quote.retail_price), specs: [{ label: 'Warranty term', value: `${Number(quote.warranty_duration) / 12} years` }, { label: 'Excess', value: `£${options.excess}` }, { label: 'Labour rate', value: `£${options.labour}/hour` }, { label: 'Per eligible claim', value: `£${options.claim}` }], included: ['Mechanical & electrical cover', 'UK claims support'], dealerName: dealer.company_name };
    const bytes = new TextEncoder().encode(JSON.stringify(safe));
    const link = `${brand.siteUrl}/customer-quote/#${btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))}`;
    const result = await new Resend(resendKey).emails.send({ from: brandFrom(brand, 'Quotes', 'quotes'), to: email, subject: `${brand.name} warranty quote ${quote.vehicle_reg}`, html: `<img src="${brand.logoUrl}" alt="${brand.name}" width="160"><h1>Your warranty quote</h1><p>Hello ${escape(quote.customer_name || '')},</p><p>${escape(quote.vehicle_reg)} ${escape(quote.vehicle_make)} ${escape(quote.vehicle_model)}</p><p>Quote reference: ${escape(safe.coverSubtitle)}</p><h2>Customer price: £${Number(quote.retail_price).toFixed(2)} including VAT</h2><ul>${safe.specs.map(s => `<li>${escape(s.label)}: ${escape(s.value)}</li>`).join('')}</ul><p>Subject to vehicle eligibility, servicing requirements and policy terms. This is a quotation, not an issued warranty.</p><p><a href="${link}">View your customer quote</a></p><p><a href="${brand.siteUrl}/terms/">Full cover details and exclusions</a></p>` });
    if (result.error) throw new Error('Email could not be sent. Please try again.');
    return new Response(JSON.stringify({ sent: true }), { headers });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Email unavailable.' }), { status: 400, headers }); }
});