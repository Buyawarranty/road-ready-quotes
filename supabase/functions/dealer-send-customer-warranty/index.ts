// Lets a dealer email the warranty details to their end customer.
// Body: { customer_id: string, to_email?: string, message?: string }

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

const money = (n: number) => `£${Number(n || 0).toFixed(2)}`;
const esc = (s: unknown) =>
  String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: { customer_id?: string; to_email?: string; message?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const customerId = String(body.customer_id || '').trim();
    if (!customerId) return json({ error: 'customer_id is required' }, 400);

    // Authenticate the calling dealer
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const { data: dealer } = await supabase
      .from('dealers')
      .select('id, name, company_name, email')
      .eq('user_id', userId)
      .maybeSingle();
    if (!dealer) return json({ error: 'Dealer account not found' }, 403);

    const { data: c } = await supabase
      .from('customers')
      .select('id, name, email, registration_plate, vehicle_make, vehicle_model, vehicle_year, plan_type, payment_type, final_amount, payment_status, warranty_start_date, policy_end_date, signup_date, dealer_id, warranty_number')
      .eq('id', customerId)
      .maybeSingle();

    if (!c) return json({ error: 'Warranty not found' }, 404);
    if (c.dealer_id !== dealer.id) return json({ error: 'Not your warranty' }, 403);

    const to = String(body.to_email || c.email || '').trim();
    if (!EMAIL_RE.test(to)) return json({ error: 'A valid customer email address is required' }, 400);

    if (!RESEND_API_KEY) return json({ error: 'Email is not configured' }, 500);

    const vehicle = [c.vehicle_make, c.vehicle_model, c.vehicle_year].filter(Boolean).join(' ');
    const ref = String(c.id).replace(/-/g, '').slice(0, 8).toUpperCase();
    const dealerName = dealer.company_name || dealer.name || 'your dealer';
    const start = c.warranty_start_date || c.signup_date;
    const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

    const rows = `
      <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(c.warranty_number || ref)}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Vehicle</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(c.registration_plate || '—')}${vehicle ? ` · ${esc(vehicle)}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600">${esc(String(c.plan_type || '').toUpperCase())} · ${esc(c.payment_type || '')} months</td></tr>
      <tr><td style="padding:8px 0;color:#666">Start date</td><td style="padding:8px 0;text-align:right;font-weight:600">${fmt(start)}</td></tr>
      ${c.policy_end_date ? `<tr><td style="padding:8px 0;color:#666">End date</td><td style="padding:8px 0;text-align:right;font-weight:600">${fmt(c.policy_end_date)}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#666">Cover value</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#f97316">${money(Number(c.final_amount ?? 0))}</td></tr>
    `;

    const note = body.message
      ? `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:12px 14px;margin:16px 0;font-size:14px;line-height:1.6">${esc(body.message)}</div>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:620px;margin:0 auto;padding:24px">
        <h1 style="color:#f97316;font-size:22px;margin:0 0 6px">Your warranty is confirmed</h1>
        <p style="font-size:13px;color:#666;margin:0 0 18px">Provided by ${esc(dealerName)} · ${new Date().toLocaleDateString('en-GB')}</p>
        <p style="font-size:14px;line-height:1.6">Hi ${esc(c.name || 'there')},</p>
        <p style="font-size:14px;line-height:1.6">${esc(dealerName)} has arranged a Panda Protect warranty for your vehicle. Here are the details:</p>
        ${note}
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #eee">${rows}</table>
        <p style="font-size:13px;color:#666;margin-top:22px">To make a claim, contact us at hello@pandaprotect.co.uk quoting your reference above.</p>
        <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:14px">Panda Protect · hello@pandaprotect.co.uk</p>
      </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Panda Protect <hello@pandaprotect.co.uk>',
        to: [to],
        reply_to: dealer.email || 'hello@pandaprotect.co.uk',
        subject: `Your vehicle warranty — ${c.registration_plate || ref}`,
        html,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Resend error', res.status, payload);
      return json({ error: (payload as any)?.message || 'Failed to send email', status: res.status }, res.status);
    }

    return json({ success: true, sent_to: to });
  } catch (err: any) {
    console.error('dealer-send-customer-warranty error', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});
