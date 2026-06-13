import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  id?: string;
  created_at?: string;
  dealership_name?: string | null;
  contact_name?: string | null;
  email_address: string;
  phone_number: string;
  monthly_vehicle_sales?: string | null;
  current_warranty_provider?: string | null;
  interested_in?: string | null;
  heard_about_us?: string | null;
  additional_information?: string | null;
}


const ADMIN_URL_BASE = 'https://pandaprotect.co.uk/dealer-admin/signups';

const row = (label: string, value: string | null | undefined) => `
  <tr>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#374151;width:200px;">${label}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111827;">${value && value.trim() ? value : '<span style="color:#9ca3af">—</span>'}</td>
  </tr>
`;

const esc = (s?: string | null) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const {
      id, created_at,
      dealership_name, contact_name,
      email_address, phone_number,
      monthly_vehicle_sales, current_warranty_provider,
      interested_in, heard_about_us, additional_information,
    } = body || ({} as Payload);


    if (!email_address || !phone_number) {
      return new Response(JSON.stringify({ error: 'email_address and phone_number required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const submittedAt = created_at
      ? new Date(created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })
      : new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const portalUrl = id ? `${ADMIN_URL_BASE}?id=${encodeURIComponent(id)}` : ADMIN_URL_BASE;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="margin:0 0 8px 0;color:#1e3a5f;">New Trade Warranty Interest Registration</h2>
        <p style="margin:0 0 16px 0;color:#374151;">A new Trade Warranty interest registration has been received.</p>

        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          ${row('Submission Date', submittedAt)}
          ${row('Dealership Name', esc(dealership_name))}
          ${row('Contact Name', esc(contact_name))}
          ${row('Email Address', `<a href="mailto:${esc(email_address)}" style="color:#eb4b00;text-decoration:none;">${esc(email_address)}</a>`)}
          ${row('Phone Number', `<a href="tel:${esc(phone_number)}" style="color:#eb4b00;text-decoration:none;">${esc(phone_number)}</a>`)}
          ${row('Monthly Vehicle Sales', esc(monthly_vehicle_sales))}
          ${row('Current Warranty Provider', esc(current_warranty_provider))}
          ${row('Interested In', esc(interested_in))}
          ${row('Where They Sell Vehicles', heard_about_us && /^https?:\/\//i.test(heard_about_us) ? `<a href="${esc(heard_about_us)}" target="_blank" style="color:#eb4b00;text-decoration:none;">${esc(heard_about_us)}</a>` : esc(heard_about_us))}
          ${row('Additional Information', esc(additional_information))}


        </table>

        <div style="text-align:center;margin:28px 0 8px 0;">
          <a href="${portalUrl}" style="display:inline-block;background:#eb4b00;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:14px;">
            View in Admin Portal →
          </a>
        </div>

        <p style="margin-top:24px;color:#6b7280;font-size:12px;text-align:center;">
          Source: /dealer-portal/signup · Panda Protect Trade Warranty
        </p>
      </div>
    `;

    const subject = 'New Trade Warranty Interest Registration';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Panda Protect <support@buyawarranty.co.uk>',
        to: ['hello@pandaprotect.co.uk', 'info@pandaprotect.co.uk'],
        reply_to: email_address,
        subject,
        html,
      }),

    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Resend error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: errorText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-dealer-waitlist error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
