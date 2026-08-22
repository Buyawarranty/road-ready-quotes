// Sends dealer-facing emails to the dealer's REGISTERED account email
// (never the end-customer email entered during the journey).
// Body: { customer_id: string, kind?: 'invoice' | 'paid' }

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: { customer_id?: string; kind?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const customerId = String(body.customer_id || '').trim();
    if (!customerId) return json({ error: 'customer_id is required' }, 400);

    const { data: c, error: cErr } = await supabase
      .from('customers')
      .select('id, name, email, phone, registration_plate, vehicle_make, vehicle_model, vehicle_year, plan_type, payment_type, final_amount, payment_status, signup_date, dealer_id, warranty_number')
      .eq('id', customerId)
      .maybeSingle();

    if (cErr || !c) return json({ error: 'Warranty not found' }, 404);
    if (!c.dealer_id) return json({ error: 'Not a dealer warranty' }, 400);

    const { data: dealer } = await supabase
      .from('dealers')
      .select('id, email, name, company_name')
      .eq('id', c.dealer_id)
      .maybeSingle();

    const dealerEmail = dealer?.email;
    if (!dealerEmail) return json({ error: 'Dealer has no registered email' }, 400);

    const kind = body.kind === 'invoice' || (c.payment_status || '') === 'invoice_pending' ? 'invoice' : 'paid';
    const amount = Number(c.final_amount ?? 0);
    const vehicle = [c.vehicle_make, c.vehicle_model, c.vehicle_year].filter(Boolean).join(' ');
    const ref = String(c.id).slice(0, 8).toUpperCase();

    const rows = `
      <tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right;font-weight:600">${ref}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Customer</td><td style="padding:8px 0;text-align:right;font-weight:600">${c.name || '—'}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Vehicle</td><td style="padding:8px 0;text-align:right;font-weight:600">${(c.registration_plate || '—')}${vehicle ? ` · ${vehicle}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600">${String(c.plan_type || '').toUpperCase()} · ${c.payment_type || ''} months</td></tr>
      <tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#f97316">${money(amount)}</td></tr>
      ${c.warranty_number ? `<tr><td style="padding:8px 0;color:#666">Warranty number</td><td style="padding:8px 0;text-align:right;font-weight:600">${c.warranty_number}</td></tr>` : ''}
    `;

    const subject = kind === 'invoice'
      ? `Invoice — warranty for ${c.registration_plate || 'your customer'} (${money(amount)})`
      : `Payment received — warranty for ${c.registration_plate || 'your customer'}`;

    const intro = kind === 'invoice'
      ? `This warranty has been added to your Panda Protect dealer account and will appear on your next invoice. Amount outstanding: <strong>${money(amount)}</strong>.`
      : `Thanks — your payment of <strong>${money(amount)}</strong> has been received and the warranty is now active.`;

    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:620px;margin:0 auto;padding:24px">
        <h1 style="color:#f97316;font-size:22px;margin:0 0 6px">${kind === 'invoice' ? 'Warranty invoiced' : 'Warranty confirmed'}</h1>
        <p style="font-size:13px;color:#666;margin:0 0 18px">${dealer?.company_name || dealer?.name || 'Dealer account'} · ${new Date().toLocaleDateString('en-GB')}</p>
        <p style="font-size:14px;line-height:1.6">${intro}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #eee">${rows}</table>
        <p style="font-size:13px;color:#666;margin-top:22px">You can view and manage this warranty in your dealer portal.</p>
        <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:14px">Panda Protect · hello@pandaprotect.co.uk</p>
      </div>`;

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured — skipping dealer warranty email');
      return json({ success: false, skipped: true, reason: 'email_not_configured' }, 200);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Panda Protect <hello@pandaprotect.co.uk>',
        to: [dealerEmail],
        subject,
        html,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Resend error', res.status, payload);
      return json({ error: (payload as any)?.message || 'Failed to send email', status: res.status }, res.status);
    }

    return json({ success: true, sent_to: dealerEmail, kind });
  } catch (err: any) {
    console.error('dealer-warranty-email error', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});
