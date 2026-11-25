// Dealer-safe warranty email preview and sending, plus Admin/Super Admin template editing.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'https://esm.sh/zod@3.23.8';
import { resolveBrand } from '../_shared/brand.ts';
import { resendFetch } from '../_shared/emailPolish.ts';
import { loadPandaWarrantyAttachments } from '../_shared/dealerWarrantyDocuments.ts';
import { ensureCustomerPortalLogin, logCustomerEmail } from '../_shared/customerPortalLogin.ts';
import { requireStaffAdmin } from '../_shared/staffAuth.ts';
import { isTerminalCoverStatus } from '../_shared/terminalCoverStatus.ts';
import {
  buildDealerWarrantyEmail,
  normaliseDealerWarrantyEmailTemplate,
  type DealerWarrantyEmailCustomer,
  type DealerWarrantyEmailDealer,
} from '../_shared/dealerWarrantyEmail.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const TemplateSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(180),
  heading: z.string().trim().min(1, 'Heading is required').max(120),
  introduction: z.string().trim().min(1, 'Introduction is required').max(1000),
  closing_text: z.string().trim().max(500),
});
const BodySchema = z.object({
  action: z.enum(['preview', 'send', 'get_template', 'save_template', 'admin_preview']).optional(),
  customer_id: z.string().uuid().optional(),
  to_email: z.string().max(320).optional(),
  message: z.string().max(1000).optional(),
  recipient_type: z.enum(['customer', 'me']).optional(),
  template: TemplateSchema.optional(),
});
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CUSTOMER_FIELDS = 'id, status, name, email, registration_plate, vehicle_make, vehicle_model, vehicle_year, plan_type, payment_type, payment_status, signup_date, dealer_id, warranty_number, phone, flat_number, building_name, building_number, street, town, county, postcode';

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function loadTemplate(admin: ReturnType<typeof serviceClient>) {
  const { data, error } = await admin
    .from('dealer_warranty_email_templates')
    .select('subject, heading, introduction, closing_text, updated_at')
    .eq('template_key', 'dealer_warranty')
    .maybeSingle();
  if (error) throw error;
  return { template: normaliseDealerWarrantyEmailTemplate(data), updated_at: data?.updated_at || null };
}

async function adminPreview(admin: ReturnType<typeof serviceClient>, brand: ReturnType<typeof resolveBrand>) {
  const { template } = await loadTemplate(admin);
  const { data: customer, error } = await admin
    .from('customers')
    .select(CUSTOMER_FIELDS)
    .eq('brand', 'pandaprotect')
    .not('dealer_id', 'is', null)
    .in('status', ['Active', 'active', 'Scheduled', 'scheduled'])
    .order('signup_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!customer) return { preview: null, preview_error: 'No dealer warranty is available to preview yet.' };
  const { data: dealer } = await admin
    .from('dealers')
    .select('id, name, company_name, email')
    .eq('id', customer.dealer_id)
    .maybeSingle();
  if (!dealer) return { preview: null, preview_error: 'The warranty dealer could not be found.' };
  const to = String(customer.email || dealer.email || '').trim();
  if (!EMAIL_RE.test(to)) return { preview: null, preview_error: 'The latest warranty has no valid email address for this preview.' };
  return {
    preview: buildDealerWarrantyEmail({
      brand,
      template,
      customer: customer as DealerWarrantyEmailCustomer,
      dealer: dealer as DealerWarrantyEmailDealer,
      recipientType: 'customer',
      to,
      login: { email: to, password: '(created when sent)' },
    }),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const brand = resolveBrand(req, { force: 'pandaprotect' });
  try {
    let rawBody: unknown;
    try { rawBody = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, 400);
    const body = parsed.data;
    const action = body.action || 'send';
    const admin = serviceClient();

    if (action === 'get_template' || action === 'save_template' || action === 'admin_preview') {
      const caller = await requireStaffAdmin(req, { corsHeaders });
      if (caller instanceof Response) return caller;

      if (action === 'save_template') {
        if (!body.template) return json({ error: 'Template wording is required' }, 400);
        const { error } = await admin
          .from('dealer_warranty_email_templates')
          .upsert({
            template_key: 'dealer_warranty',
            ...body.template,
            updated_by: caller.user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'template_key' });
        if (error) throw error;
      }

      const stored = await loadTemplate(admin);
      const preview = await adminPreview(admin, brand);
      return json({ success: true, ...stored, ...preview });
    }

    const customerId = body.customer_id;
    if (!customerId) return json({ error: 'customer_id is required' }, 400);
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Please sign in to the dealer portal first.' }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userError || !userId) return json({ error: 'Please sign in to the dealer portal first.' }, 401);

    const { data: dealer } = await admin
      .from('dealers')
      .select('id, name, company_name, email')
      .eq('user_id', userId)
      .maybeSingle();
    if (!dealer) return json({ error: 'Dealer account not found' }, 403);

    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select(CUSTOMER_FIELDS)
      .eq('id', customerId)
      .eq('brand', 'pandaprotect')
      .maybeSingle();
    if (customerError || !customer) return json({ error: 'Warranty not found' }, 404);
    if (customer.dealer_id !== dealer.id) return json({ error: 'This warranty does not belong to your dealer account' }, 403);
    if (isTerminalCoverStatus(customer.status)) return json({ error: `This warranty is ${String(customer.status).toLowerCase()}; an active-cover confirmation cannot be sent.` }, 409);

    const recipientType = body.recipient_type === 'me' ? 'me' : 'customer';
    const to = String(body.to_email || (recipientType === 'me' ? dealer.email : customer.email) || '').trim();
    if (!EMAIL_RE.test(to)) return json({ error: 'Enter a valid email address' }, 400);
    const { template } = await loadTemplate(admin);
    const login = recipientType === 'customer' && action !== 'preview'
      ? await ensureCustomerPortalLogin(admin, to, { policy_number: (customer as any).warranty_number, customer_id: customer.id }).catch(() => null)
      : recipientType === 'customer' ? { email: to, password: '(created when sent)' } : null;
    const email = buildDealerWarrantyEmail({
      login,
      brand,
      template,
      customer: customer as DealerWarrantyEmailCustomer,
      dealer: dealer as DealerWarrantyEmailDealer,
      recipientType,
      to,
      message: body.message,
    });

    if (action === 'preview') return json({ success: true, preview: email });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'Email sending is not configured' }, 500);
    try {
      email.attachments = await loadPandaWarrantyAttachments();
    } catch (error) {
      console.error('dealer-send-customer-warranty PDF loading error', error);
      return json({ error: 'The warranty PDFs could not be loaded, so no email was sent. Please try again.' }, 502);
    }
    const response = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify(email),
    });
    const provider = await response.json().catch(() => ({}));
    await logCustomerEmail(admin, { to, subject: email.subject, customerId: (customer as any).id, ok: response.ok, providerId: (provider as any)?.id, error: response.ok ? null : (provider as any)?.message, kind: recipientType === 'customer' ? 'warranty_active' : 'warranty_copy_to_dealer' });
    if (!response.ok) {
      console.error('dealer-send-customer-warranty Resend error', response.status, provider);
      return json({
        error: (provider as { message?: string })?.message || 'The email service could not send this email. Please try again.',
        status: response.status,
      }, response.status);
    }

    return json({
      success: true,
      sent_to: to,
      from: email.from,
      provider_id: (provider as { id?: string })?.id || null,
      attachment_count: email.attachments?.length || 0,
      attachment_names: (email.attachments || []).map(attachment => attachment.filename),
    });
  } catch (error) {
    console.error('dealer-send-customer-warranty error', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});
