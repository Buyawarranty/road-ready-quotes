// Dealer cancellation request: saves the request and emails support@pandaprotect.co.uk.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'https://esm.sh/zod@3.23.8';
import { resolveBrand, brandFrom } from '../_shared/brand.ts';
import { resendFetch } from '../_shared/emailPolish.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const BodySchema = z.object({
  customer_id: z.string().uuid(),
  reason: z.string().trim().min(3, 'Please give a reason for the cancellation').max(1000),
});

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, 400);
    }
    const { customer_id, reason } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // The signed-in user must own an active dealer account.
    const { data: dealer, error: dealerErr } = await admin
      .from('dealers')
      .select('id, user_id, company_name, name, email, status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (dealerErr || !dealer || dealer.status !== 'active') {
      return json({ error: 'Dealer not authorized' }, 403);
    }

    // The warranty must belong to this dealer.
    const { data: customer, error: customerErr } = await admin
      .from('customers')
      .select('id, name, email, registration_plate, warranty_number, plan_type, dealer_id')
      .eq('id', customer_id)
      .maybeSingle();
    if (customerErr || !customer || customer.dealer_id !== dealer.id) {
      return json({ error: 'Warranty not found for this dealer' }, 404);
    }

    // Only one pending request per warranty.
    const { data: existing } = await admin
      .from('dealer_cancellation_requests')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) {
      return json({ error: 'A cancellation request is already pending for this warranty' }, 409);
    }

    const { data: saved, error: insertErr } = await admin
      .from('dealer_cancellation_requests')
      .insert({ dealer_id: dealer.id, customer_id, reason })
      .select('id')
      .single();
    if (insertErr) {
      if (insertErr.code === '23505') {
        return json({ error: 'A cancellation request is already pending for this warranty' }, 409);
      }
      console.error('Could not save dealer cancellation request', insertErr);
      return json({ error: 'Could not save the cancellation request' }, 500);
    }

    // Email the support team. A failed email must not lose the saved request.
    const brand = resolveBrand(req, { brand: 'pandaprotect' });
    const dealerName = dealer.company_name || dealer.name || 'Dealer';
    const reg = customer.registration_plate || 'Unknown registration';
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #6b7280; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Dealer cancellation request</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>A dealer has asked for a warranty to be cancelled:</p>
            <div style="margin: 15px 0; padding: 10px; background-color: #ffffff; border-left: 4px solid #6b7280;">
              <strong>Dealership:</strong><br>${escapeHtml(dealerName)}${dealer.email ? ` (${escapeHtml(dealer.email)})` : ''}
            </div>
            <div style="margin: 15px 0; padding: 10px; background-color: #ffffff; border-left: 4px solid #6b7280;">
              <strong>Customer:</strong><br>${escapeHtml(customer.name || 'Unknown')}${customer.email ? ` (${escapeHtml(customer.email)})` : ''}
            </div>
            <div style="margin: 15px 0; padding: 10px; background-color: #ffffff; border-left: 4px solid #6b7280;">
              <strong>Registration:</strong><br>${escapeHtml(reg)}
            </div>
            ${customer.warranty_number ? `
            <div style="margin: 15px 0; padding: 10px; background-color: #ffffff; border-left: 4px solid #6b7280;">
              <strong>Warranty reference:</strong><br>${escapeHtml(customer.warranty_number)}
            </div>` : ''}
            <div style="margin: 15px 0; padding: 10px; background-color: #ffffff; border-left: 4px solid #6b7280;">
              <strong>Reason:</strong><br>${escapeHtml(reason).replace(/\n/g, '<br>')}
            </div>
            <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
              <strong>Next steps:</strong> review the request in the admin dashboard (Dealers → Cancellations),
              process any refund due, and update the warranty status.
            </p>
          </div>
        </body>
      </html>`;

    const emailResponse = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: brandFrom(brand, 'Dealer Portal', 'noreply'),
        to: [brand.supportEmail],
        subject: `Dealer cancellation request — ${reg} (${dealerName})`,
        html,
      }),
    }).catch((e) => { console.error(e); return null; });

    let emailSent = false;
    if (!emailResponse) {
      console.error('Cancellation email send threw');
    } else if (!emailResponse.ok) {
      console.error('Resend API error:', await emailResponse.text());
    } else {
      emailSent = true;
    }

    return json({ success: true, id: saved.id, email_sent: emailSent });
  } catch (error: any) {
    console.error('Error in dealer-request-cancellation:', error);
    return json({ error: error?.message || 'Unexpected error' }, 500);
  }
});
